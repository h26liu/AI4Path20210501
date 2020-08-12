import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from 'src/environments/environment';
import { NotificationsService } from 'angular2-notifications';
import { NgxSpinnerService } from 'ngx-spinner';

import * as moment from 'moment';
import { Dictionary } from 'lodash';

declare var OpenSeadragon: any;
declare var $: any; // include jquery

// TODO:
// - Make checkbox work and save selected ones into array (DONE)
// - Finished stepper (DONE)
// - Show label information on images/canvas (DONE)

// Next Step:
// - click labeled image to pop up modal with osd (DONE)

@Component({
    selector: 'app-relearning',
    templateUrl: './relearning.component.html',
    styleUrls: ['./relearning.component.scss'],
})
export class RelearningComponent implements OnInit {
    private BASE_URL = environment.API_URL;

    labeledImagesReady: boolean = false;

    labeledImages: any = [];

    selectedImage: any = {};

    selectedImages: any = [];
    selectedModel: any = '';

    systemMsg: any = 'loading labeled images from database';

    comment: any;
    models: any = [];

    colorHash: Dictionary<string> = {
        oligo: '#007bff',
        SN: '#8E44AD',
        AC: '#28a745',
        endo: '#dc3545',
        LN: '#17a2b8',
        neuron: '#ffc107',
        undetermined: '#343a40',
    };

    // osd viewer
    viewer: any;

    constructor(
        private http: HttpClient,
        private _spinner: NgxSpinnerService,
        private _notifications: NotificationsService
    ) {}

    ngOnInit(): void {
        this._spinner.show();
        this.fetchLabeledImages();
        this.fetchModelList();
    }

    fetchModelList() {
        this.http.get(`${this.BASE_URL}/api/list/model`).subscribe(
            (res) => {
                this.models = (<Object>res)['files'];
                // set default model
                this.selectedModel = this.models[0];
            },
            (err) => {
                console.log(err);
            }
        );
    }

    onCheckboxChange(image) {
        let isChecked = (document.getElementById(
            `checkbox-${image.name}`
        ) as HTMLInputElement).checked; // TRUE means we just checked current image checkbox

        if (isChecked) {
            this.selectedImages.push(image.name);
        } else {
            let filteredArr = this.selectedImages.filter(function (_image) {
                return _image != image.name;
            });
            this.selectedImages = filteredArr;
        }
    }

    onConfirmClick() {
        const self = this;
        self.http
            .post<any>(`${self.BASE_URL}/api/list/retraining/save`, {
                created: Date.now(),
                data: {
                    model: self.selectedModel,
                    images: self.selectedImages,
                    comment: self.comment,
                },
            })
            .subscribe(
                (res) => {
                    this.popUpNotification(
                        200,
                        'Re-training request successfully submitted, this component will be reset in 5 seconds.'
                    );

                    setTimeout(() => {
                        window.location.reload();
                    }, 5000);
                },
                (err) => {
                    this.popUpNotification(500, err);
                }
            );
    }

    fetchLabeledImages() {
        const self = this;

        this.http.get(`${this.BASE_URL}/api/list/labeled/`).subscribe(
            (res) => {
                try {
                    (<Object>res)['files'].map((file) => {
                        fetch(`${this.BASE_URL}/labeled/objects/${file}`)
                            .then((res) => res.json())
                            .then(async (out) => {
                                let created = out.created;
                                let response = await fetch(
                                    `${this.BASE_URL}/labeled/original/${out.name}`
                                );
                                let data = await response.blob();
                                let imgURL = <string>await this.toBase64(data);

                                let _canvas;
                                _canvas = self.createCanvas(out.name);

                                self.labeledImages.push({
                                    name: out.name,
                                    src: imgURL,
                                    labels: out.data,
                                    created: created
                                        ? moment(created).format('ll')
                                        : null,
                                    canvas: _canvas,
                                });
                            })
                            .catch((err) => {
                                throw err;
                            });
                    });

                    setTimeout(() => {
                        self.labeledImages.map((labeledImg) => {
                            let _image = new Image();
                            _image.addEventListener('load', function () {
                                self.drawOnCanvas(_image, labeledImg);
                            });
                            _image.src = labeledImg.src;
                        });

                        self._spinner.hide();
                        self.labeledImagesReady = true;
                        self.popUpNotification(200, 'labled images loaded');
                    }, 2000);
                } catch (fetchErr) {
                    console.error(fetchErr);
                }
            },
            (err) => {
                console.error(err);
            }
        );
    }

    createCanvas(name) {
        let canvas = document.createElement('canvas');
        canvas.id = `${name}-canvas`;

        return canvas;
    }

    drawOnCanvas(image, labeledImgObj) {
        let canvas = labeledImgObj.canvas;
        let name = labeledImgObj.name;

        let labelObjs = [];
        labelObjs = labeledImgObj.labels;

        let divElement = document.getElementById(
            `${name}-div`
        ) as HTMLDivElement;

        canvas.height = divElement.offsetWidth;
        canvas.width = divElement.offsetWidth;
        canvas.style.width = '100%';
        canvas.style.height = '100%';

        canvas.style.display = 'block';

        image.canx = 0;
        image.cany = 0;
        image.canw = canvas.width;
        image.canh = canvas.height;

        let canvasCtx = canvas.getContext('2d');
        canvasCtx.drawImage(
            image,
            0,
            0,
            image.width,
            image.height, // source rectangle
            0,
            0,
            canvas.width,
            canvas.height
        );

        labelObjs.map((labelObj) => {
            let xminPercent = 100 / (image.width / labelObj.xmin);
            let xmaxPercent = 100 / (image.width / labelObj.xmax);
            let yminPercent = 100 / (image.height / labelObj.ymin);
            let ymaxPercent = 100 / (image.height / labelObj.ymax);

            let xmin = (canvas.width * xminPercent) / 100;
            let xmax = (canvas.width * xmaxPercent) / 100;
            let ymin = (canvas.height * yminPercent) / 100;
            let ymax = (canvas.height * ymaxPercent) / 100;

            canvasCtx.fillStyle = 'rgba(255,255,255,0.2)';
            canvasCtx.fillRect(xmin, ymin, xmax - xmin, ymax - ymin);

            canvasCtx.font = '10px Arial';
            canvasCtx.fillStyle = 'white';
            canvasCtx.fillText(labelObj.name, xmin, ymin - 5, ymin);

            canvasCtx.strokeStyle = labelObj.color;
            canvasCtx.lineWidth = 1;
            canvasCtx.strokeRect(xmin, ymin, xmax - xmin, ymax - ymin);
        });

        divElement.appendChild(canvas);
    }

    onImageViewerOpen(labeledImg) {
        this.systemMsg = 'loading selected labeled image';
        this._spinner.show();

        const self = this;

        let labelObjs = [];
        labelObjs = labeledImg.labels;

        this.selectedImage = labeledImg;

        let image = new Image();
        image.addEventListener('load', function () {
            let canvas = document.createElement('canvas');
            // let canvasCtx = canvas.getContext('2d');

            this.width = image.width;
            this.height = image.height;
            canvas.width = this.width;
            canvas.height = this.height;

            let canvasCtx = canvas.getContext('2d');

            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            canvasCtx.drawImage(image, 0, 0, this.width, this.height);

            labelObjs.map((labelObj) => {
                let xminPercent = 100 / (this.width / labelObj.xmin);
                let xmaxPercent = 100 / (this.width / labelObj.xmax);
                let yminPercent = 100 / (this.height / labelObj.ymin);
                let ymaxPercent = 100 / (this.height / labelObj.ymax);

                let xmin = (canvas.width * xminPercent) / 100;
                let xmax = (canvas.width * xmaxPercent) / 100;
                let ymin = (canvas.height * yminPercent) / 100;
                let ymax = (canvas.height * ymaxPercent) / 100;

                canvasCtx.fillStyle = 'rgba(255,255,255,0.2)';
                canvasCtx.fillRect(xmin, ymin, xmax - xmin, ymax - ymin);

                canvasCtx.font = '15px Arial';
                canvasCtx.fillStyle = 'white';
                canvasCtx.fillText(labelObj.name, xmin, ymin - 5, ymin);

                canvasCtx.strokeStyle = labelObj.color;
                canvasCtx.lineWidth = 2;
                canvasCtx.strokeRect(xmin, ymin, xmax - xmin, ymax - ymin);
            });

            self.setOsdObject(canvas.toDataURL());
        });
        image.src = labeledImg.src;
    }

    setOsdObject(url) {
        // clear osg element
        $('#imageViewer').empty();
        // osd viewer
        this.viewer = OpenSeadragon({
            crossOriginPolicy: 'Anonymous',
            id: 'imageViewer',
            prefixUrl: '../../assets/openseadragon/images/',
            showNavigator: false,
            tileSources: {
                type: 'image',
                url: url,
            },
        });

        setTimeout(() => {
            // toggle modal
            $('#imageViewerModal').modal('show');

            this._spinner.hide();
        }, 1000);
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

    toBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
}
