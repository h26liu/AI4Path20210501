import { Component, OnInit } from '@angular/core';

import { NotificationsService } from 'angular2-notifications';
import { NgxSpinnerService } from 'ngx-spinner';

import { faSearchPlus } from '@fortawesome/free-solid-svg-icons';
import { faSearchMinus } from '@fortawesome/free-solid-svg-icons';
import { faHome } from '@fortawesome/free-solid-svg-icons';
import { faExpandArrowsAlt } from '@fortawesome/free-solid-svg-icons';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';

import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';

declare var OpenSeadragon: any;
declare var $: any; // include jquery

@Component({
    selector: 'app-ki67detector',
    templateUrl: './ki67detector.component.html',
    styleUrls: ['./ki67detector.component.scss'],
})
export class Ki67detectorComponent implements OnInit {
    private BASE_URL = environment.API_URL;

    isImageSelected: boolean = false;
    isImageLoaded: boolean = false;

    selectedImage: any;

    selectedSample: any = null;
    samples: any[];

    systemMsg: any = '';

    viewer: any; // osd viewer

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
        this.systemMsg = 'getting detector ready';
        this._spinner.show();

        this.fetchImagesList();
    }

    async onImageSelect(event) {
        if (event.target.files.length > 0) {
            const self = this;

            self.systemMsg = 'loading selected image';
            self._spinner.show();

            if (self.isImageLoaded) {
                self.isImageLoaded = false;
            }

            self.selectedImage = event.target.files[0];
            self.isImageSelected = true;

            self.setOsdObject(
                <string>await this.toBase64(event.target.files[0])
            );
            self.popUpNotification(200, 'selected image loaded');
        }
    }

    async onSampleSelect(event) {
        const self = this;

        self.systemMsg = 'loading selected image';
        self._spinner.show();

        if (self.isImageLoaded) {
            self.isImageLoaded = false;
        }

        const value = event.target.value;

        let response = await fetch(`${this.BASE_URL}/public/ki67/original/${value}`);
        let data = await response.blob();
        let metadata = {
            type: 'image/jpeg',
        };
        let file = new File([data], value, metadata);
        this.selectedImage = file;
        this.isImageSelected = true;

        self.setOsdObject(<string>await this.toBase64(file));
        self.popUpNotification(200, 'selected image loaded');
    }

    fetchImagesList() {
        this.http.get(`${this.BASE_URL}/ki67`).subscribe(
            (res) => {
                this.samples = (<Object>res)['files'];

                this._spinner.hide();
            },
            (err) => {
                console.log(err);

                this._spinner.hide();
            }
        );
    }

    async onDetectClick() {
        const self = this;

        self.systemMsg = 'detecting selected Ki67 image';
        self._spinner.show();

        let formData = new FormData();
        formData.append('file', self.selectedImage);

        this.http
            .post<any>(`${this.BASE_URL}/ki67/detections`, formData)
            .subscribe(
                async (res) => {
                    if (res.code == 200) {
                        let response = await fetch(
                            `${this.BASE_URL}${res.path}`
                        );
                        let data = await response.blob();

                        self.setOsdObject(<string>await this.toBase64(data));
                        self.popUpNotification(200, res.message);
                    } else {
                        self._spinner.hide();
                        self.popUpNotification(500, res.message);
                    }
                },
                (err) => {
                    console.log(err);

                    self._spinner.hide();
                    self.popUpNotification(500, err);
                }
            );
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

        this.isImageLoaded = true;
        this._spinner.hide();
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
