import { Component, ViewChild } from '@angular/core';
import {
    HttpClient,
    HttpHeaders,
    HttpRequest,
    HttpEventType,
} from '@angular/common/http';
import { environment } from 'src/environments/environment';

import { DetectorComponent } from '../detector/detector.component';

import { NotificationsService } from 'angular2-notifications';
import { NgxSpinnerService } from 'ngx-spinner';

import { faSearchPlus } from '@fortawesome/free-solid-svg-icons';
import { faSearchMinus } from '@fortawesome/free-solid-svg-icons';
import { faHome } from '@fortawesome/free-solid-svg-icons';
import { faExpandArrowsAlt } from '@fortawesome/free-solid-svg-icons';
import { faCut } from '@fortawesome/free-solid-svg-icons';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { Dictionary } from 'lodash';

declare var OpenSeadragon: any;
declare var $: any; // include JQuery

@Component({
    selector: 'app-wsl',
    templateUrl: './wsl.component.html',
    styleUrls: ['./wsl.component.scss'],
})
export class WslComponent {
    private BASE_URL = environment.API_URL;

    @ViewChild(DetectorComponent) detector;

    // flags
    isRegionSelected: boolean = false;
    isImageLoaded: boolean = false;
    imageUploadFinished: boolean = false;
    retrivingSample: boolean = false;
    retrivingDetection: boolean = false;
    transformingImage: boolean = false;
    isImageDetected: boolean = false;

    hover: boolean = false;

    // osd selection
    selectedRegion: any; // selected region
    osdSelectionObj: any; // selection object

    samples: any[] = ['wslexample.svs'];
    selectedSample: any = 'select from database';

    // zoom factor
    zoomFactor: any;

    duomo: any;
    viewer: any;

    osdOverlays: any = [];
    osdOverlayLabels: any = [];

    minImagePoint: any;
    maxImagePoint: any;

    dzImages: any = [];
    dziData: any = {};

    image: any;
    imageName: any = '';

    wslprediction: any;

    uploadEvent: any;

    uploadPercent: any;

    systemMsg: any = '';

    selectBtnColor: any = '#dbdbdb';

    colorHash: Dictionary<string> = {
        oligo: '#007bff',
        SN: '#8E44AD',
        AC: '#28a745',
        endo: '#dc3545',
        LN: '#17a2b8',
        neuron: '#ffc107',
        undetermined: '#343a40',
    };

    // font awesome icons
    faSearchPlus = faSearchPlus;
    faSearchMinus = faSearchMinus;
    faHome = faHome;
    faExpandArrowsAlt = faExpandArrowsAlt;
    faCut = faCut;
    faQuestionCircle = faQuestionCircle;

    constructor(
        private http: HttpClient,
        private _spinner: NgxSpinnerService,
        private _notifications: NotificationsService
    ) {}

    ngOnInit(): void {
        this.fetchImagesList();
    }

    fetchImagesList() {
        this.http.get(`${this.BASE_URL}/brain/wholeslide`).subscribe(
            (res) => {
                (<Object>res)['files'].map((dir) => {
                    dir = dir.replace(/\_/g, ' ');
                    this.dzImages.push(dir);
                });
            },
            (err) => {
                console.log(err);
            }
        );
    }

    getDziData() {
        this.isImageDetected = false;

        this._spinner.show();
        this.systemMsg = 'retriving deep zooming image from server';

        this.retrivingSample = true;

        this.http
            .post(`${this.BASE_URL}/brain/wholeslide/retrievedata`, {
                name: this.selectedSample,
            })
            .subscribe(
                (res: any) => {
                    let folderName = this.selectedSample.replace(/\s+/g, '_');

                    this.dziData = {
                        Url: `${this.BASE_URL}/public/brain/wsl/${folderName}/output/${this.selectedSample}_files/`,
                        Format: res.Format,
                        Overlap: res.Overlap,
                        TileSize: res.TileSize,
                        Size: {
                            Width: res.Width,
                            Height: res.Height,
                        },
                    };

                    this.loadDzi();

                    this.retrivingSample = false;

                    this.popUpNotification(200, 'deep zooming image is ready');
                    this.systemMsg = '';
                    this._spinner.hide();
                },
                (err) => {
                    console.log(err);

                    this.retrivingSample = false;

                    this.popUpNotification(500, err);
                    this.systemMsg = '';
                    this._spinner.hide();
                }
            );
    }

    onUpload(event) {
        if (event.target.files.length > 0) {
            if (event.target.files[0].size <= 524288000) {
                this.isImageDetected = false;

                this.image = event.target.files[0];
                this.imageName = event.target.files[0].name;

                // toggle confirm modal
                $('#uploadConfirmModal').modal('show');
            } else {
                this.popUpNotification(
                    500,
                    'whole slide image must be smaller than 500 MB, please select another one and try again'
                );
            }
        }
    }

    onConfirm() {
        // toggle confirm modal
        $('#uploadConfirmModal').modal('hide');

        this._spinner.show();
        this.systemMsg = 'uploading selected image to server';

        // checks file id exists or not, checks on name and last modified
        let fileId = `${this.image.name}-${this.image.lastModified}`;
        let headers = new HttpHeaders({
            size: this.image.size.toString(),
            'x-file-id': fileId,
            name: this.imageName,
        });

        // To know whether file exist or not before making upload
        this.http
            .get(`${this.BASE_URL}/brain/dzi/status`, { headers: headers })
            .subscribe((res: any) => {
                // console.log(JSON.stringify(res));
                if (res.status === 'file is present') {
                    this._spinner.hide();

                    // let folderName = this.imageName.replace(/\s+/g, '_');
                    let folderName = this.imageName;

                    // let resData = JSON.parse(res.data);
                    let resData = res.data;

                    this.dziData = {
                        Url: `${this.BASE_URL}/public/brain/wsl/${folderName}/output/${this.imageName}_files/`,
                        Format: resData.Format,
                        Overlap: resData.Overlap,
                        TileSize: resData.TileSize,
                        Size: {
                            Width: resData.Width,
                            Height: resData.Height,
                        },
                    };

                    this.loadDzi();

                    return;
                }
                let uploadedBytes = res.uploaded;
                let uploadHeaders = new HttpHeaders({
                    size: this.image.size.toString(),
                    'x-file-id': fileId,
                    'x-start-byte': uploadedBytes.toString(),
                    name: this.imageName,
                });
                const req = new HttpRequest(
                    'POST',
                    `${this.BASE_URL}/brain/dzi/upload`,
                    this.image.slice(uploadedBytes, this.image.size + 1),
                    {
                        headers: uploadHeaders,
                        reportProgress: true, // continously fetch data from server of how much file is uploaded
                    }
                );
                this.http.request(req).subscribe(
                    (res: any) => {
                        if (res.type === HttpEventType.UploadProgress) {
                            this.uploadPercent = Math.round(
                                (100 * res.loaded) / res.total
                            );
                            if (this.uploadPercent >= 100) {
                                if (!this.imageUploadFinished) {
                                    this.imageUploadFinished = true;

                                    this.popUpNotification(
                                        200,
                                        'selected image successfully uploaded'
                                    );
                                    this.systemMsg =
                                        'transforming whole slide image to deep zooming image';
                                }
                            }
                        } else {
                            if ('body' in res) {
                                let folderName = this.imageName.replace(
                                    /\s+/g,
                                    '_'
                                );

                                this.dziData = {
                                    Url: `${this.BASE_URL}/public/brain/wsl/${folderName}/output/${this.imageName}_files/`,
                                    Format: res.body.Format,
                                    Overlap: res.body.Overlap,
                                    TileSize: res.body.TileSize,
                                    Size: {
                                        Width: res.body.Width,
                                        Height: res.body.Height,
                                    },
                                };

                                this.loadDzi();

                                this.popUpNotification(
                                    200,
                                    'whole slide image successfully transformed to dzi image'
                                );

                                this.fetchImagesList();
                                this.selectedSample = this.imageName;

                                this.systemMsg = '';
                                this._spinner.hide();
                            }
                        }
                    },
                    (err) => {
                        this.popUpNotification(500, err);
                        this.systemMsg = '';
                        this._spinner.hide();

                        console.error(err);
                    }
                );
            });
    }

    loadDzi() {
        this.isImageDetected = false;
        // clear osg element
        $('#osdviewer').empty();
        // image object
        this.duomo = {
            Image: {
                xmlns: 'http://schemas.microsoft.com/deepzoom/2008',
                Url: this.dziData.Url,
                Format: this.dziData.Format,
                Overlap: this.dziData.Overlap,
                TileSize: this.dziData.TileSize,
                Size: {
                    Width: this.dziData.Size.Width,
                    Height: this.dziData.Size.Height,
                },
            },
        };
        // set up tooltips for selection
        OpenSeadragon.setString(
            'Tooltips.SelectionConfirm',
            'Confirm Selection'
        );
        OpenSeadragon.setString('Tooltips.SelectionCancel', 'Cancel Selection');

        // osd viewer
        this.viewer = OpenSeadragon({
            crossOriginPolicy: 'Anonymous',
            id: 'osdviewer',
            prefixUrl: '../../assets/openseadragon/images/',
            showNavigator: true,
            toolbar: 'osd-navbar',
            tileSources: this.duomo,
            zoomInButton: 'zoom-in',
            zoomOutButton: 'zoom-out',
            homeButton: 'zoom-fit',
            fullPageButton: 'full-screen',
            // debugMode: true,
        });
        // osd imagehelper event handler
        let imagingHelper = this.viewer.activateImagingHelper({
            onImageViewChanged: this.onImageViewChange,
        });
        // set up osd selection
        this.setSelectionObj();
        this.isImageLoaded = true;

        const _viewer = this.viewer;
        const self = this;

        this.viewer.addHandler('animation-finish', function (event) {
            let originWebPoint = new OpenSeadragon.Point(0, 0);
            let maxWebPoint = new OpenSeadragon.Point(
                _viewer.viewport.getContainerSize().x,
                _viewer.viewport.getContainerSize().y
            );

            let originViewPoint = _viewer.viewport.pointFromPixel(
                originWebPoint
            );
            let maxViewPoint = _viewer.viewport.pointFromPixel(maxWebPoint);

            let originImagePoint = _viewer.viewport.viewportToImageCoordinates(
                originViewPoint
            );
            let maxImagePoint = _viewer.viewport.viewportToImageCoordinates(
                maxViewPoint
            );

            self.minImagePoint = originImagePoint;
            self.maxImagePoint = maxImagePoint;

            if (self.isImageDetected && self.getZoomFactor() >= 10.0) {
                self.addOverlay();
            }
        });

        this.viewer.addHandler('animation-start', function (event) {
            if (self.isImageDetected) {
                // remove overlays
                self.osdOverlays.map((overlay) => {
                    self.viewer.removeOverlay(overlay);
                });

                // remove labels
                self.osdOverlayLabels.map((label) => {
                    self.viewer.removeOverlay(label);
                });

                // reset arrays
                self.osdOverlays = [];
                self.osdOverlayLabels = [];
            }
        });
    }

    setSelectionObj() {
        if (this.viewer) {
            // set up OSD selection
            this.osdSelectionObj = this.viewer.selection({
                element: null, // html element to use for overlay
                showSelectionControl: false, // show button to toggle selection mode
                toggleButton: null, // dom element to use as toggle button
                showConfirmDenyButtons: true,
                styleConfirmDenyButtons: true,
                returnPixelCoordinates: true,
                keyboardShortcut: 'c', // key to toggle selection mode
                rect: null, // initial selection as an OpenSeadragon.SelectionRect object
                allowRotation: true, // turn selection rotation on or off as needed
                startRotated: false, // alternative method for drawing the selection; useful for rotated crops
                startRotatedHeight: 0.1, // only used if startRotated=true; value is relative to image height
                restrictToImage: true, // true = do not allow any part of the selection to be outside the image
                onSelection: (rect) => {
                    this.onRegionSelect(rect);
                }, // callback
                prefixUrl: null, // overwrites OpenSeadragon's option
                navImages: {
                    // overwrites OpenSeadragon's options
                    selection: {
                        REST:
                            '../../openseadragonselection/images/selection_rest.png',
                        GROUP:
                            '../../openseadragonselection/images/selection_grouphover.png',
                        HOVER:
                            '../../openseadragonselection/images/selection_hover.png',
                        DOWN:
                            '../../openseadragonselection/images/selection_pressed.png',
                    },
                    selectionConfirm: {
                        REST:
                            '../../openseadragonselection/images/selection_confirm_rest.png',
                        GROUP:
                            '../../openseadragonselection/images/selection_confirm_grouphover.png',
                        HOVER:
                            '../../openseadragonselection/images/selection_confirm_hover.png',
                        DOWN:
                            '../../openseadragonselection/images/selection_confirm_pressed.png',
                    },
                    selectionCancel: {
                        REST:
                            '../../openseadragonselection/images/selection_cancel_rest.png',
                        GROUP:
                            '../../openseadragonselection/images/selection_cancel_grouphover.png',
                        HOVER:
                            '../../openseadragonselection/images/selection_cancel_hover.png',
                        DOWN:
                            '../../openseadragonselection/images/selection_cancel_pressed.png',
                    },
                },
                borderStyle: {
                    // overwriteable style defaults
                    width: '1px',
                    color: 'black',
                },
                handleStyle: {
                    top: '50%',
                    left: '50%',
                    width: '6px',
                    height: '6px',
                    margin: '-4px 0 0 -4px',
                    background: '#000',
                    border: '1px solid #ccc',
                },
                cornersStyle: {
                    width: '6px',
                    height: '6px',
                    background: '#000',
                    border: '1px solid #ccc',
                },
            });
        }
    }

    setZoomLevel(level) {
        let tiledImage = this.viewer.world.getItemAt(0); // Assuming you just have a single image in the viewer
        let targetZoom =
            tiledImage.source.dimensions.x /
            this.viewer.viewport.getContainerSize().x;

        // targetZoom = image_size / viewport_size
        // targetZoom    = 1 : 40x
        // targetZoom/2  = 0.5 : 20x
        // targetZoom/4  = 0.25 : 10x
        // targetZoom/8  = 0.125 : 5x
        // targetZoom/10 = 0.1 : 4x
        // targetZoom/20 = 0.05 : 2x

        if (level === 2) {
            targetZoom = targetZoom / 20;
        } else if (level === 4) {
            targetZoom = targetZoom / 10;
        } else if (level === 5) {
            targetZoom = targetZoom / 8;
        } else if (level === 10) {
            targetZoom = targetZoom / 4;
        } else if (level === 20) {
            targetZoom = targetZoom / 2;
        }

        this.viewer.viewport.zoomTo(targetZoom, null, true);
    }

    async onRegionSelect(rect) {
        let selectedRect = new OpenSeadragon.Rect(
            rect.x,
            rect.y,
            rect.width,
            rect.height,
            rect.degree
        );
        const viewportRect = this.viewer.viewport.imageToViewportRectangle(
            selectedRect
        );
        const webRect = this.viewer.viewport.viewportToViewerElementRectangle(
            viewportRect
        );
        const { x, y, width, height } = webRect || {};
        const { canvas } = this.viewer.drawer;
        let viewportSrc = canvas.toDataURL();
        const self = this;
        const img = new Image();
        img.onload = async function () {
            let croppedCanvas = document.createElement('canvas');
            let ctx = croppedCanvas.getContext('2d');
            croppedCanvas.width = width;
            croppedCanvas.height = height;
            ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
            let croppedSrc = croppedCanvas.toDataURL();
            // create file object
            let data = await (await fetch(croppedSrc)).blob();
            let metadata = {
                type: 'image/jpeg',
            };
            let file = new File(
                [data],
                `wslexample${Date.now()}.jpg`,
                metadata
            );
            // set flags
            self.selectedRegion = file;
            self.isRegionSelected = true;
        };
        img.src = viewportSrc;
        // toggle selection
        this.toggleRegionSelection();
    }

    onImageViewChange(event) {
        if (document.getElementById('zoomfactorSpan') !== null) {
            // set zoom factor value to display
            (document.getElementById(
                'zoomfactorSpan'
            ) as HTMLImageElement).textContent = `zoom level: ${(
                event.zoomFactor * 40
            ).toFixed(1)}x`;
        }
    }

    toggleRegionSelection() {
        this.osdSelectionObj.toggleState();

        this.selectBtnColor =
            this.selectBtnColor === '#dbdbdb'
                ? (this.selectBtnColor = 'gray')
                : (this.selectBtnColor = '#dbdbdb');
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

    addOverlay() {
        console.log(this.zoomFactor * 40);

        let wsiPrediction = this.wslprediction;
        for (let i = 0; i < wsiPrediction.length; i++) {
            var name = wsiPrediction[i].name;
            var detections = wsiPrediction[i].detections;

            var name1 = name.split('.');
            var res = name1[0].split('_');

            let defaultWidth = 800 * Number(res[0]);
            let defaultHeight = 800 * Number(res[1]);

            for (let j = 0; j < detections.length; j++) {
                const box = detections[j][2];
                const cellname = detections[j][0];

                let xx = box[0] - box[2] / 2 + defaultWidth;
                let yy = box[1] - box[3] / 2 + defaultHeight;
                let w = box[2];
                let h = box[3];

                let outOfRange =
                    xx < this.minImagePoint.x ||
                    xx > this.maxImagePoint.x ||
                    yy < this.minImagePoint.y ||
                    yy > this.maxImagePoint.y;

                if (outOfRange) continue;

                //
                // cell label
                //
                let span = document.createElement('div');
                span.textContent = cellname;
                span.style.fontSize = '10px';
                span.style.color = 'white';

                span.id =
                    'span' +
                    cellname +
                    xx.toString() +
                    yy.toString() +
                    w.toString() +
                    h.toString();
                this.osdOverlayLabels.push(span.id);

                this.viewer.addOverlay({
                    element: span,
                    px: xx,
                    py: yy + h,
                    width: w,
                    height: h,
                });

                //
                // cell rect
                //
                let div = document.createElement('div');
                div.style.backgroundColor = 'rgba(255,255,255,0.3)';
                div.style.border = `1.5px solid ${this.colorHash[cellname]}`;

                div.id =
                    cellname +
                    xx.toString() +
                    yy.toString() +
                    w.toString() +
                    h.toString();
                this.osdOverlays.push(div.id);

                this.viewer.addOverlay({
                    element: div,
                    px: xx,
                    py: yy,
                    width: w,
                    height: h,
                });
            }
        }
    }

    getZoomFactor() {
        let zoomFactor = '1';
        if (document.getElementById('zoomfactorSpan') !== null) {
            // set zoom factor value to display
            let zoomFactorSpan = (document.getElementById(
                'zoomfactorSpan'
            ) as HTMLImageElement).textContent;
            zoomFactor = zoomFactorSpan.replace(/^\D+/g, '');
        }

        return parseFloat(zoomFactor);
    }

    onDetectClick() {
        this.retrivingDetection = true;

        this._spinner.show();
        this.systemMsg = 'retriving wsi detection results from server';

        this.http
            .post<any>(`${this.BASE_URL}/brain/detectwsl/`, {
                name: this.selectedSample,
            })
            .subscribe(
                (res) => {
                    this.wslprediction = res.all_detections;
                    this.isImageDetected = true;
                    this.retrivingDetection = false;

                    // this.addOverlay();

                    this._spinner.hide();
                    this._notifications.success(
                        'success',
                        'Detection results successfully retrieved'
                    );
                },
                (err) => {
                    console.log(err);
                    this.retrivingDetection = false;

                    this._spinner.hide();
                    this._notifications.error('error', err);
                }
            );

        // fetch(`${this.BASE_URL}/public/brain/wsl/detections/Neocortex1.json`)
        //     .then((res) => res.json())
        //     .then((out) => {
        //         this.wslprediction = out.all_detections;
        //         console.log(this.wslprediction);
        //         // this.drawOnOSD();
        //         this.isImageDetected = true;

        //         this.addOverlay();
        //     });
    }
}
