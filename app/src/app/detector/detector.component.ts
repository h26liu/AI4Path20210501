import {
    Component,
    OnInit,
    Input,
    ViewChild,
    ElementRef,
    OnChanges,
    Output,
    EventEmitter,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from 'src/environments/environment';
import { NotificationsService } from 'angular2-notifications';
import { NgxSpinnerService } from 'ngx-spinner';

import { faSearchPlus } from '@fortawesome/free-solid-svg-icons';
import { faSearchMinus } from '@fortawesome/free-solid-svg-icons';
import { faHome } from '@fortawesome/free-solid-svg-icons';
import { faExpandArrowsAlt } from '@fortawesome/free-solid-svg-icons';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';

import { Dictionary } from 'lodash';
import Chart from 'chart.js'; // import chartjs lib

declare var OpenSeadragon: any;
declare var $: any; // include jquery

@Component({
    selector: 'app-detector',
    templateUrl: './detector.component.html',
    styleUrls: ['./detector.component.scss'],
})
export class DetectorComponent implements OnInit, OnChanges {
    private BASE_URL = environment.API_URL;

    @Output('getImagesList') getImagesList: EventEmitter<
        any
    > = new EventEmitter();

    // **image src data from parent component
    @Input('imageSrc') imageSrc: any;
    // **image canvas
    @ViewChild('mycanvas') mycanvas: ElementRef;

    // **flags
    initialLoading: boolean = true; // used to indicate if it is initially loading
    imageSelected: boolean = false;
    isLoaded: boolean = false;
    isDetailsDisabled: boolean = false;
    labelClicked: boolean = false; // used to indicate if the action raised by label click

    // **detection models
    models: any = [];

    // **dynamic style
    overflowX: any;
    overflowY: any;

    // **variables
    threshold: Number;
    prediction: any;
    modalImgSrc: any;
    image: any;
    imageName: any;
    systemMsg: string;
    selectedModel: any;
    labels: Array<string> = [];
    labelsCount: Dictionary<any> = {};
    labelsTxtStyle: Dictionary<any> = {}; // boolean value to indicate if each label is removed
    colorHash: Dictionary<string> = {
        oligo: '#007bff',
        SN: '#8E44AD',
        AC: '#28a745',
        endo: '#dc3545',
        LN: '#17a2b8',
        neuron: '#ffc107',
        undetermined: '#343a40',
    };
    myChart: any = null;

    // osd viewer
    viewer: any;

    // data for annotator
    dataForAnnotator: any = [];

    // font awesome icons
    faSearchPlus = faSearchPlus;
    faSearchMinus = faSearchMinus;
    faHome = faHome;
    faExpandArrowsAlt = faExpandArrowsAlt;
    faQuestionCircle = faQuestionCircle;

    constructor(
        private http: HttpClient,
        private _spinner: NgxSpinnerService,
        private _notifications: NotificationsService
    ) {}

    ngOnInit(): void {
        this.threshold = 0.5;
        // this.selectedModel = this.models[0]; // default model

        this.updateFlags(false, 'loading selected image');
        this.setContainerOverflow('hidden', 'hidden');
        this._spinner.show();

        // load image. why using timeout? waiting for DOM elements fully loaded
        setTimeout(() => {
            // get available detection models
            this.fetchModelList();

            this.onImageLoad();
            this.initialLoading = false;
        }, 2000);
    }

    ngOnChanges() {
        if (!this.initialLoading) {
            this.updateFlags(false, 'loading selected image');
            this._spinner.show();

            setTimeout(() => {
                // get available detection models
                this.fetchModelList();

                this.onImageLoad();
            }, 2000);
        }
    }

    fetchModelList() {
        this.http.get(`${this.BASE_URL}/brain/models`).subscribe(
            (res) => {
                this.models = (<Object>res)['files'];

                this.selectedModel =
                    this.models.length !== 0
                        ? this.models[0]
                        : 'no available model'; // default model
            },
            (err) => {
                console.log(err);
            }
        );
    }

    async onImageLoad() {
        this.image = this.imageSrc; // src from child component
        this.imageName = this.imageSrc.name;
        this.threshold = 0.5;

        const self = this;
        // processing image preview
        let reader = new FileReader();
        reader.onload = function (event) {
            var img = new Image();
            img.addEventListener('load', function () {
                this.width = img.width;
                this.height = img.height;

                self.setOsdObject(img.src);
                const { canvas } = self.viewer.drawer;

                canvas.width = this.width;
                canvas.height = this.height;

                self._spinner.hide();
                self.popUpNotification(200, `${self.imageName} loaded`);

                // context.clearRect(0, 0, canvas.width, canvas.height);
                // context.drawImage(img, 0, 0, this.width, this.height);
            });
            img.src = <string>event.target.result;
        };
        reader.readAsDataURL(this.image);
    }

    setOsdObject(url) {
        // clear osd element
        $('#detectorViewer').empty();
        // osd viewer
        this.viewer = OpenSeadragon({
            crossOriginPolicy: 'Anonymous',
            id: 'detectorViewer',
            prefixUrl: '../../assets/openseadragon/images/',
            showNavigator: true,
            // toolbar: 'detector-osd-navbar',
            tileSources: {
                type: 'image',
                url: url,
            },
            // zoomInButton: 'detector-zoom-in',
            // zoomOutButton: 'detector-zoom-out',
            // homeButton: 'detector-zoom-fit',
            // fullPageButton: 'detector-full-screen',
        });
    }

    onDetectClick() {
        // toggle modal
        $('#uploadConfirmModal').modal('show');
    }

    onConfirm() {
        // toggle confirm modal
        $('#uploadConfirmModal').modal('hide');
        this.updateFlags(false, 'retrieving prediction result from server');
        this._spinner.show();
        // get form data ready
        let formData = new FormData();
        formData.append('file', this.image);
        formData.append('modelName', this.selectedModel);

        // predict api call
        this.http.post<any>(`${this.BASE_URL}/brain/detections`, formData).subscribe(
            (res) => {
                this.popUpNotification(res.code, res.message);
                // callback data
                this.prediction = res.prediction.detections;
                // processing res data
                // and generate rects
                this.drawOnCanvas();
                this._spinner.hide();
                this.updateFlags(true, 'upload image to start');
                // update existing images list
                this.getImagesList.emit();
            },
            (err) => {
                console.log(err);
                this.popUpNotification(400, err);
                this._spinner.hide();
                this.updateFlags(false, `${err}, please try again :/`);
            }
        );
    }

    drawOnCanvas() {
        const self = this;
        self.dataForAnnotator = [];
        // label related vars
        self.labels = self.labelClicked ? self.labels : [];
        self.labelsCount = self.labelClicked ? self.labelsCount : {};
        self.labelsTxtStyle = self.labelClicked ? self.labelsTxtStyle : {};
        // set up canvas
        // let canvas = this.mycanvas.nativeElement;
        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        // draw
        var reader = new FileReader();
        reader.onload = function (event) {
            var img = new Image();
            img.addEventListener('load', function () {
                this.width = img.width;
                this.height = img.height;
                canvas.width = this.width;
                canvas.height = this.height;
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(img, 0, 0, this.width, this.height);

                for(let i = 0; i< self.prediction.length; i++){
                    // console.log(self.prediction)
                    // console.log(self.prediction.name)
                    var name1 = self.prediction[i].name.split(".")
                    var res= name1[0].split("_")
                    let defaultWidth = 800* Number(res[1])
                    let defaultHeight = 800*Number(res[0])
                    for (let j=0; j< self.prediction[i].detections.length; j++){
                        
                        const confidence = self.prediction[i].detections[j][1]
                        if (confidence > self.threshold){

                            const box = self.prediction[i].detections[j][2]
                            let cellname = self.prediction[i].detections[j][0]
                            if (!self.labelClicked) {
                                // only reload related data on initial loading or when threshold adjusted
                                if (self.labels.indexOf(cellname) === -1) {
                                    self.labels.push(cellname);
                                    Object.assign(self.labelsCount, {
                                        [cellname]: 1,
                                    });
                                    Object.assign(self.labelsTxtStyle, {
                                        [cellname]: 'none',
                                    });
                                } else {
                                    self.labelsCount[cellname] += 1;
                                }
                            }

                            if (self.labelsTxtStyle[cellname] === 'none') 
                               {
                                context.fillStyle = 'rgba(255,255,255,0.2)';
                                context.strokeStyle = self.colorHash[cellname];
                                context.font = '15px Arial';
                                context.fillStyle = 'white';
                                context.fillText(
                                    cellname,
                                    box[0]-box[2]/2 + defaultWidth,
                                    box[1]-box[3]/2 + defaultHeight - 5
                                );
                                context.lineWidth = 2.5;
                                context.strokeRect(
                                    box[0]-box[2]/2  + defaultWidth,
                                    box[1]-box[3]/2 + defaultHeight,
                                    box[2],
                                    box[3]
                                
                                );

                                // @
                                // process data list for annotator
                                // @
                                self.dataForAnnotator.push({
                                    name: cellname,
                                    x: box[0]-box[2]/2 + defaultWidth,
                                    y: box[1]-box[3]/2 + defaultHeight,
                                    w: box[2],
                                    h: box[3],
                                    color: self.colorHash[cellname],
                                });
                            }
                        }
                    }

            }
           
                // display detected image on osd
                self.setOsdObject(canvas.toDataURL());
                self.labelClicked = false;
            });
            img.src = <string>event.target.result;
        };
        reader.readAsDataURL(self.image);
    }

    updateThreshold() {
        this.drawOnCanvas();
        this.popUpNotification(
            200,
            `${this.threshold} probability threshold value applied`
        );
    }

    onDetailClick() {
        this.generateChart();
        // toggle modal
        $('#detailsModal').modal('show');
    }

    onLabelClick(label) {
        this.labelClicked = true;

        this.labelsTxtStyle[label] === 'none'
            ? (this.labelsTxtStyle[label] = 'line-through')
            : (this.labelsTxtStyle[label] = 'none');

        // check if details btn needs to be disabled
        Object.values(this.labelsTxtStyle).indexOf('none') === -1
            ? (this.isDetailsDisabled = true)
            : (this.isDetailsDisabled = false);

        this.drawOnCanvas();
    }

    // TOOLS *****
    // update flags
    updateFlags(loaded: boolean, msg: string, selected: boolean = true) {
        this.isLoaded = loaded;
        this.systemMsg = msg;
        this.imageSelected = selected;
    }

    setContainerOverflow(x: string, y: string) {
        this.overflowX = x;
        this.overflowY = y;
    }

    popUpNotification(code, message) {
        if (code == 100) {
            this._notifications.info('notification', message, {
                timeOut: 1000,
                showProgressBar: false,
            });
        } else if (code == 200) {
            this._notifications.success('success', message);
        } else {
            this._notifications.error('error', message);
        }
    }

    urltoFile(url, filename, mimeType) {
        return fetch(url)
            .then(function (res) {
                return res.arrayBuffer();
            })
            .then(function (buf) {
                return new File([buf], filename, { type: mimeType });
            });
    }

    toBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });

    generateChart() {
        // process data
        let _data = {
            labels: [],
            datasets: [
                {
                    label: '# of labels',
                    data: [],
                    backgroundColor: [],
                },
            ],
        };
        this.labels.forEach((label) => {
            if (this.labelsTxtStyle[label] === 'none') {
                _data.labels.push(label);
                _data.datasets[0].data.push(this.labelsCount[label]);
                _data.datasets[0].backgroundColor.push(this.colorHash[label]);
            }
        });
        if (this.myChart != null) {
            this.myChart.destroy();
        }
        // create Chart object
        var ctx = $('#myChart');
        this.myChart = new Chart(ctx, {
            type: 'doughnut',
            data: _data,
        });
    }
}
