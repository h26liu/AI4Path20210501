import { Component, OnInit } from '@angular/core';
import { ViewEncapsulation } from '@angular/core';

import { Router } from '@angular/router';

import { Dictionary } from 'lodash';
import { HttpClient } from '@angular/common/http';

import { environment } from 'src/environments/environment';
import { NotificationsService } from 'angular2-notifications';
import { NgxSpinnerService } from 'ngx-spinner';

import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { faObjectUngroup } from '@fortawesome/free-solid-svg-icons';
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons';

import * as JSZip from 'jszip'; // import JSZip package
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

declare var $: any; // include jquery

@Component({
    selector: 'app-annotator',
    templateUrl: './annotator.component.html',
    styleUrls: ['./annotator.component.scss'],
})
export class AnnotatorComponent implements OnInit {
    private BASE_URL = environment.API_URL;

    // FLAGS
    isNewLabel: boolean = false;
    isCanvasReady: boolean = false;
    isDrawingBox: boolean = false;
    isResizingBox: boolean = false;
    isImageLoaded: boolean = false;
    isAnnotationEmpty: boolean = true;
    onLoading: boolean = false;

    labeledImgName: any = '';

    // IMAGES
    image: any;
    imageName: any = '';

    selectedImage: any;
    images: any = [];

    selectedSample: any = null;
    samples: any[];

    labelObject: any = {}; // obj

    drawingPoint1: any = { x: 0, y: 0 };
    drawingPoint2: any = { x: 0, y: 0 };

    // MAIN CANVAS
    canvas: any;

    // DYNAMIC STYLE
    overflowX: any = 'hidden';
    overflowY: any = 'hidden';

    uploadEvent: any;

    newAnnotationClass: string = '';
    selectedAnnotation: any = {};
    annotations: any = {};
    targetAnnotation: any = {};

    // LABELS
    selectedLabel: string = '';
    labelInput: string = '';

    labels: any = ['oligo', 'AC', 'endo', 'neuron'];

    // LABEL COLORS
    colorInput: string = '#666666';
    colors: any = {
        oligo: '#007bff',
        AC: '#28a745',
        endo: '#dc3545',
        neuron: '#ffc107',
    }; // key: labelname, val: colorhash

    systemMsg: any = '';

    // @@@
    dataFromDetector: any = undefined;

    // @
    // JSZip
    // @
    jsZip: JSZip;

    // icons
    faPlus = faPlus;
    faPencilAlt = faPencilAlt;
    faObjectUngroup = faObjectUngroup;
    faTrashAlt = faTrashAlt;

    constructor(
        private http: HttpClient,
        private _spinner: NgxSpinnerService,
        private _notifications: NotificationsService,
        private router: Router,
        private sanitizer: DomSanitizer
    ) {
        this.dataFromDetector = this.router.getCurrentNavigation().extras.state;
    }

    ngOnInit(): void {
        this.systemMsg = 'getting annotator ready';
        this._spinner.show();

        this.fetchImagesList();
        this.onLabelTagClick(this.labels[0]); // set default cell

        // this.fetchLabeledImages();

        setTimeout(async () => {
            this.canvas = document.getElementById('myCanvas');
            // disable default right click context menu
            $('body').on('contextmenu', '#myCanvas', function (e) {
                return false;
            });

            // render labels
            this.selectedLabel = this.labels[0];
            // set up flag
            this.isCanvasReady = true;

            // @
            // load image and annotations
            // @
            if (this.dataFromDetector !== undefined) {
                const self = this;

                let response = await fetch(
                    `${this.BASE_URL}/uploads/${self.dataFromDetector.name}`
                );
                let data = await response.blob();
                let imageSrc = <string>await this.toBase64(data);
                self.imageName = self.dataFromDetector.name;
                // image on load event
                let _image = new Image();
                _image.addEventListener('load', function () {
                    self.selectedImage = _image;
                    // set up canvas size
                    self.canvas.width = self.selectedImage.width;
                    self.canvas.height = self.selectedImage.height;
                    // add new image to image array
                    self.images.push({
                        name: self.imageName,
                        src: imageSrc,
                        image: _image,
                    });
                    self.isImageLoaded = true;
                    self.selectedSample = null;
                    self.setContainerOverflow('auto', 'auto');
                    self.popUpNotification(200, `${self.imageName} loaded`);

                    self.annotations[self.imageName] = [];
                    self.dataFromDetector.data.map((object) => {
                        if (self.labels.indexOf(object.name) === -1)
                            self.labels.push(object.name);

                        if (!(object.name in self.colors))
                            self.colors[object.name] = object.color;

                        self.annotations[self.imageName].push({
                            name: object.name,
                            color: object.color,
                            xmin: parseInt(object.x),
                            ymin: parseInt(object.y),
                            xmax: parseInt(object.x + object.w),
                            ymax: parseInt(object.y + object.h),
                            coordinates: {
                                x: object.x,
                                y: object.y,
                                w: object.w,
                                h: object.h,
                            },
                        });
                    });

                    self.isAnnotationEmpty =
                        self.annotations[self.imageName].length > 0
                            ? false
                            : true;
                    self.showOriginalImage();
                });
                _image.src = imageSrc;
            }

            this._spinner.hide();
        }, 2000);
    }

    onUploadClick(event) {
        if (event.target.files.length > 0) {
            this.imageName = '';

            if (event.target.files[0].type === 'application/zip') {
                //
                // Zip file
                //
                // if (
                //     window.confirm(
                //         'After loading zip file, current works will be disappeared. Are you sure to want to load the zip file?'
                //     )
                // ) {
                const self = this;

                self.jsZip = new JSZip();
                self.jsZip.loadAsync(event.target.files[0]).then(
                    async (zip) => {
                        // PROCESS ZIP FILE CONTENT HERE
                        for (const file in zip.files) {
                            let base64 = await self.jsZip
                                .file(file)
                                .async('base64');

                            if (self.isImageLoaded) {
                                self.flushCanvas();
                            }
                            self.isImageLoaded = false;

                            // process file name with extension
                            self.imageName = zip.files[file].name;

                            let extension = zip.files[file].name.substr(
                                zip.files[file].name.indexOf('.') + 1
                            );
                            let imageSrc =
                                `data:image/${extension};base64,` + base64;

                            // image on load event
                            let _image = new Image();
                            _image.addEventListener('load', function () {
                                self.selectedImage = _image;
                                // set up canvas size
                                self.canvas.width = self.selectedImage.width;
                                self.canvas.height = self.selectedImage.height;
                                // add new image to image array
                                self.images.push({
                                    name: self.imageName,
                                    src: imageSrc,
                                    image: _image,
                                });
                                self.showOriginalImage();
                                self.isImageLoaded = true;
                                self.selectedSample = null;
                                self.setContainerOverflow('auto', 'auto');
                                self.popUpNotification(
                                    200,
                                    `${self.imageName} loaded`
                                );
                            });
                            _image.src = imageSrc;
                        }
                    },
                    () => {
                        alert('Not a valid zip file');
                    }
                );
                // }
            } else {
                $('#imageNameModal').modal('show');
                this.uploadEvent = event;
            }
        }
    }

    getImgContent(file): SafeUrl {
        return this.sanitizer.bypassSecurityTrustUrl(file);
    }

    async onImageUpload() {
        $('#imageNameModal').modal('hide');

        const self = this;
        let event = self.uploadEvent;

        if (self.isImageLoaded) {
            self.flushCanvas();
        }
        self.isImageLoaded = false;

        // process file name with extension
        let extension = event.target.files[0].name.substr(
            event.target.files[0].name.indexOf('.')
        );
        self.imageName += extension;

        let imageSrc = <string>await self.toBase64(event.target.files[0]);
        // image on load event
        let _image = new Image();
        _image.addEventListener('load', function () {
            self.selectedImage = _image;
            // set up canvas size
            self.canvas.width = self.selectedImage.width;
            self.canvas.height = self.selectedImage.height;
            // add new image to image array
            self.images.push({
                name: self.imageName,
                src: imageSrc,
                image: _image,
            });
            self.showOriginalImage();
            self.isImageLoaded = true;
            self.selectedSample = null;
            self.setContainerOverflow('auto', 'auto');
            self.popUpNotification(200, `${self.imageName} loaded`);
        });
        _image.src = imageSrc;
    }

    onSampleSelect(event) {
        // create file object
        const self = this;

        this.systemMsg = 'loading selected image';
        this._spinner.show();

        if (self.isImageLoaded) {
            self.flushCanvas();
            self.isImageLoaded = false;
        }

        setTimeout(async () => {
            const value = event.target.value;
            let response = await fetch(`${this.BASE_URL}/uploads/${value}`);
            let data = await response.blob();

            self.imageName = self.selectedSample;

            let _image = new Image();
            _image.addEventListener('load', function () {
                self.selectedImage = _image;
                self.showOriginalImage();

                self.isImageLoaded = true;

                self.setContainerOverflow('auto', 'auto');

                self._spinner.hide();
                self.popUpNotification(200, `${self.imageName} loaded`);
            });
            _image.src = <string>await this.toBase64(data);
        }, 1000);
    }

    fetchImagesList() {
        this.http.get(`${this.BASE_URL}/api/list/segmented`).subscribe(
            (res) => {
                this.samples = (<Object>res)['files'];
            },
            (err) => {
                console.log(err);
            }
        );
    }

    // @
    // LABEL RELATED
    // @
    onLabelTagClick(label) {
        this.selectedLabel = label;

        this.labelObject.name = this.selectedLabel;
        this.labelObject.color = this.colors[this.selectedLabel];

        this.popUpNotification(100, `${label} class selected`);
    }

    onLabelEditClick(label) {
        $('#labelModal').modal('show');
        this.isNewLabel = false;

        this.labelInput = label;
        this.colorInput = this.colors[label];
    }

    onAddLabelClick() {
        $('#labelModal').modal('show');
        this.isNewLabel = true;

        this.labelInput = '';
        this.colorInput = '#666666';
    }

    onAddLabelConfirm() {
        if (this.isNewLabel) {
            if (!this.isNameColorUnique()) {
                this.popUpNotification(
                    500,
                    'label name and color must be both unique'
                );
                return;
            }

            this.colors[this.labelInput] = this.colorInput;
            this.labels.push(this.labelInput);

            this.popUpNotification(
                200,
                `${this.labelInput} label successfully created`
            );
        } else {
            // save new color
            this.colors[this.labelInput] = this.colorInput;

            // update labels list
            let filteredArr = [];
            this.labels.map((label) => {
                if (label === this.selectedLabel)
                    filteredArr.push(this.labelInput);
                else filteredArr.push(label);
            });
            this.labels = filteredArr;

            if (this.imageName in this.annotations) {
                // update annotations list
                let updatedAnnotations = [];
                this.annotations[this.imageName].map((annotation) => {
                    if (annotation.name === this.selectedLabel) {
                        annotation.name = this.labelInput;
                        annotation.color = this.colors[this.labelInput];
                    }
                    updatedAnnotations.push(annotation);
                });
                this.annotations[this.imageName] = updatedAnnotations;

                this.showOriginalImage();
            }

            this.popUpNotification(
                200,
                `${this.labelInput} label successfully updated`
            );
        }

        $('#labelModal').modal('hide');
        this.isNewLabel = false;

        this.selectedLabel = this.labelInput;
        this.onLabelTagClick(this.selectedLabel);

        this.updateColorsList();

        this.labelInput = '';
        this.colorInput = '#666666';
    }

    onDeleteLabelClick() {
        // update labels list
        let updatedLabels = [];
        this.labels.map((label) => {
            if (label !== this.selectedLabel) updatedLabels.push(label);
        });
        this.labels = updatedLabels;

        if (this.imageName in this.annotations) {
            // update annotations list
            let updatedAnnotations = [];
            this.annotations[this.imageName].map((annotation) => {
                if (annotation.name !== this.selectedLabel)
                    updatedAnnotations.push(annotation);
            });
            this.annotations[this.imageName] = updatedAnnotations;

            this.showOriginalImage();
        }

        this.popUpNotification(
            200,
            `${this.selectedLabel} label successfully deleted`
        );
        $('#labelModal').modal('hide');

        this.updateColorsList();

        this.selectedLabel = this.labels.length !== 0 ? this.labels[0] : '';
        if (this.labels.length !== 0) {
            this.labelObject.name = this.selectedLabel;
            this.labelObject.color = this.colors[this.selectedLabel];
        }
    }

    onAnnotationClick(annotation) {
        this.selectedAnnotation = annotation;
        this.selectedLabel = annotation.name;
        this.newAnnotationClass = this.selectedLabel;
        $('#annotationClassModal').modal('show');
    }

    onAnnotationClassChange() {
        let updatedArr = [];
        this.annotations[this.imageName].map((annotation) => {
            if (annotation === this.selectedAnnotation) {
                annotation.name = this.newAnnotationClass;
                annotation.color = this.colors[this.newAnnotationClass];
            }
            updatedArr.push(annotation);
        });
        this.annotations[this.imageName] = updatedArr;

        this.showOriginalImage();

        $('#annotationClassModal').modal('hide');
        this.popUpNotification(200, 'annotation class updated');
    }

    isNameColorUnique() {
        let unique = true;

        if (this.labels.indexOf(this.labelInput) != -1) unique = false;
        if (Object.values(this.colors).indexOf(this.colorInput) != -1)
            unique = false;

        return unique;
    }

    updateColorsList() {
        // remove unused colors
        let updatedColors = {};
        this.labels.map((label) => {
            if (label in this.colors) {
                updatedColors[label] = this.colors[label];
            }
        });
        this.colors = updatedColors;
    }

    // @
    // LEFT IMAGE LIST PANEL
    // @
    onImageListClick(image, name) {
        if (image === this.selectedImage) {
            return;
        }

        this.selectedImage = image;
        this.imageName = name;

        this.showOriginalImage();
    }

    // @
    // RIGHT ANNOTATIONS LIST
    // @
    onDeleteClick(annotation) {
        let filteredArr = [];
        this.annotations[this.imageName].map((el) => {
            if (el != annotation) filteredArr.push(el);
        });

        this.annotations[this.imageName] = filteredArr;
        this.showOriginalImage();

        this.isAnnotationEmpty =
            this.annotations[this.imageName].length > 0 ? false : true;
    }

    onFinishClick() {
        if (
            !(this.imageName in this.annotations) ||
            this.annotations[this.imageName].length == 0
        ) {
            this.popUpNotification(400, 'no target area selected');
            return;
        }

        $('#finishConfirmModal').modal('show');
    }

    saveLabeledImage() {
        const self = this;

        self.systemMsg = 'saving labeled image to database';
        self._spinner.show();

        let newAnnotations = [];

        this.images.map((image) => {
            let tempObj = {
                name: image.name,
                data: this.annotations[image.name],
                src: image.src,
            };
            newAnnotations.push(tempObj);
        });

        self.http
            .post<any>(`${self.BASE_URL}/api/list/labeled/save`, {
                created: Date.now(),
                data: newAnnotations,
            })
            .subscribe(
                (res) => {
                    self.popUpNotification(
                        res.code,
                        'annotations successfully saved, annotator will be reset in 5 seconds'
                    );
                    self._spinner.hide();

                    $('#finishConfirmModal').modal('hide');

                    setTimeout(() => {
                        window.location.reload();
                    }, 5000);
                },
                (err) => {
                    self.popUpNotification(400, err);
                    self._spinner.hide();

                    console.log(err);

                    $('#finishConfirmModal').modal('hide');

                    setTimeout(() => {
                        window.location.reload();
                    }, 5000);
                }
            );
    }

    onResetClick() {
        this.resetLabelObjArr(); // clear existing label objs
        this.showOriginalImage();

        this.popUpNotification(100, 'annotations reset');
    }

    addLabelObject() {
        if ('w' in this.labelObject && this.labelObject.w != 0) {
            let xmin = this.labelObject.x;
            let ymin = this.labelObject.y;
            let xmax = xmin + this.labelObject.w;
            let ymax = ymin + this.labelObject.h;

            this.labelObject.xmin = xmin;
            this.labelObject.ymin = ymin;
            this.labelObject.xmax = xmax;
            this.labelObject.ymax = ymax;

            // this.labelObjects.push(this.labelObject);
            if (!(this.imageName in this.annotations)) {
                this.annotations[this.imageName] = [
                    {
                        name: this.labelObject.name,
                        color: this.labelObject.color,
                        xmin: parseInt(this.labelObject.xmin),
                        ymin: parseInt(this.labelObject.ymin),
                        xmax: parseInt(this.labelObject.xmax),
                        ymax: parseInt(this.labelObject.ymax),
                        coordinates: {
                            x: this.labelObject.x,
                            y: this.labelObject.y,
                            w: this.labelObject.w,
                            h: this.labelObject.h,
                        },
                    },
                ];
            } else {
                let _annotations = [];
                this.annotations[this.imageName].map((a) => {
                    if (this.checkTargetAnnotation(a, this.targetAnnotation)) {
                        _annotations.push(a);
                    }
                });
                _annotations.push({
                    name: this.isEmpty(this.targetAnnotation)
                        ? this.labelObject.name
                        : this.targetAnnotation.name,
                    color: this.isEmpty(this.targetAnnotation)
                        ? this.labelObject.color
                        : this.targetAnnotation.color,
                    xmin: parseInt(this.labelObject.xmin),
                    ymin: parseInt(this.labelObject.ymin),
                    xmax: parseInt(this.labelObject.xmax),
                    ymax: parseInt(this.labelObject.ymax),
                    coordinates: {
                        x: this.labelObject.x,
                        y: this.labelObject.y,
                        w: this.labelObject.w,
                        h: this.labelObject.h,
                    },
                });
                this.annotations[this.imageName] = _annotations;
            }

            this.isAnnotationEmpty =
                this.annotations[this.imageName].length > 0 ? false : true;

            this.showOriginalImage();
        }
    }

    canvasOnMouseDown(event) {
        // mouse down event handler
        if (event.button == 0 && this.isImageLoaded) {
            if (!this.isDrawingBox) {
                if (this.selectedLabel === '') {
                    this.popUpNotification(400, 'please select a label class');
                    return;
                }

                this.isDrawingBox = true;

                this.drawingPoint1.x =
                    event.offsetX > this.selectedImage.canx
                        ? event.offsetX
                        : this.selectedImage.canx;
                this.drawingPoint1.x =
                    this.drawingPoint1.x <
                    this.selectedImage.canx + this.selectedImage.canw
                        ? this.drawingPoint1.x
                        : this.selectedImage.canx + this.selectedImage.canw;
                this.drawingPoint1.y =
                    event.offsetY > this.selectedImage.cany
                        ? event.offsetY
                        : this.selectedImage.cany;
                this.drawingPoint1.y =
                    this.drawingPoint1.y <
                    this.selectedImage.cany + this.selectedImage.canh
                        ? this.drawingPoint1.y
                        : this.selectedImage.cany + this.selectedImage.canw;

                if (this.imageName in this.annotations)
                    this.findTargetAnnotation();
            }
        } else if (event.button == 2) {
            this.showImage();
        }
    }

    canvasOnMouseUp(event) {
        if (this.isDrawingBox) {
            this.addLabelObject();
            this.targetAnnotation = {};
            this.isDrawingBox = false;
            this.isResizingBox = false;
        }
    }

    canvasOnMouseMove(event) {
        // mouse move event handler
        if (this.isDrawingBox) {
            this.drawingPoint2.x =
                event.offsetX > this.selectedImage.canx
                    ? event.offsetX
                    : this.selectedImage.canx;
            this.drawingPoint2.x =
                this.drawingPoint2.x <
                this.selectedImage.canx + this.selectedImage.canw
                    ? this.drawingPoint2.x
                    : this.selectedImage.canx + this.selectedImage.canw;
            this.drawingPoint2.y =
                event.offsetY > this.selectedImage.cany
                    ? event.offsetY
                    : this.selectedImage.cany;
            this.drawingPoint2.y =
                this.drawingPoint2.y <
                this.selectedImage.cany + this.selectedImage.canh
                    ? this.drawingPoint2.y
                    : this.selectedImage.cany + this.selectedImage.canw;

            if (!this.isResizingBox) {
                this.labelObject.x = Math.min(
                    this.drawingPoint1.x,
                    this.drawingPoint2.x
                );
                this.labelObject.y = Math.min(
                    this.drawingPoint1.y,
                    this.drawingPoint2.y
                );
                this.labelObject.w = Math.abs(
                    this.drawingPoint1.x - this.drawingPoint2.x
                );
                this.labelObject.h = Math.abs(
                    this.drawingPoint1.y - this.drawingPoint2.y
                );
            } else {
                this.labelObject.x = this.targetAnnotation['coordinates'].x;
                this.labelObject.y = this.targetAnnotation['coordinates'].y;
                this.labelObject.w = this.targetAnnotation['coordinates'].w;
                this.labelObject.h = this.targetAnnotation['coordinates'].h;

                if (this.targetAnnotation['position'] === 'tl') {
                    this.labelObject.w +=
                        this.labelObject.x - this.drawingPoint2.x;
                    this.labelObject.h +=
                        this.labelObject.y - this.drawingPoint2.y;
                    this.labelObject.x = this.drawingPoint2.x;
                    this.labelObject.y = this.drawingPoint2.y;
                } else if (this.targetAnnotation['position'] === 'tr') {
                    this.labelObject.w = Math.abs(
                        this.labelObject.x - this.drawingPoint2.x
                    );
                    this.labelObject.h +=
                        this.labelObject.y - this.drawingPoint2.y;
                    this.labelObject.y = this.drawingPoint2.y;
                } else if (this.targetAnnotation['position'] === 'bl') {
                    this.labelObject.w +=
                        this.labelObject.x - this.drawingPoint2.x;
                    this.labelObject.h = Math.abs(
                        this.labelObject.y - this.drawingPoint2.y
                    );
                    this.labelObject.x = this.drawingPoint2.x;
                } else if (this.targetAnnotation['position'] === 'br') {
                    this.labelObject.w = Math.abs(
                        this.labelObject.x - this.drawingPoint2.x
                    );
                    this.labelObject.h = Math.abs(
                        this.labelObject.y - this.drawingPoint2.y
                    );
                }
            }

            this.showImage();

            let canvasCtx = this.canvas.getContext('2d');
            canvasCtx.fillStyle = 'rgba(255,255,255,0.2)';
            canvasCtx.fillRect(
                this.labelObject.x,
                this.labelObject.y,
                this.labelObject.w,
                this.labelObject.h
            );
            // canvasCtx.strokeStyle = this.labelObject.color;
            canvasCtx.strokeStyle = '#dbdbdb';
            canvasCtx.lineWidth = 1.5;
            canvasCtx.strokeRect(
                this.labelObject.x,
                this.labelObject.y,
                this.labelObject.w,
                this.labelObject.h
            );

            // draw squares at each corner
            // upper left
            canvasCtx.strokeRect(
                this.labelObject.x - 4,
                this.labelObject.y - 4,
                8,
                8
            );
            // upper right
            canvasCtx.strokeRect(
                this.labelObject.x + this.labelObject.w - 4,
                this.labelObject.y - 4,
                8,
                8
            );
            // lower left
            canvasCtx.strokeRect(
                this.labelObject.x - 4,
                this.labelObject.y + this.labelObject.h - 4,
                8,
                8
            );
            // lower right
            canvasCtx.strokeRect(
                this.labelObject.x + this.labelObject.w - 4,
                this.labelObject.y + this.labelObject.h - 4,
                8,
                8
            );
        }
    }

    annotationOnMouseOver(annotation) {
        // flush canvas first
        let canvasCtx = this.canvas.getContext('2d');

        // canvasCtx.canvas.width = this.selectedImage.width;
        // canvasCtx.canvas.height = this.selectedImage.height;

        canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.selectedImage.canx = 0;
        this.selectedImage.cany = 0;
        this.selectedImage.canw = this.canvas.width;
        this.selectedImage.canh = this.canvas.height;

        canvasCtx.drawImage(this.selectedImage, 0, 0);

        if (this.imageName in this.annotations) {
            this.annotations[this.imageName].map((_annotation) => {
                this.drawBox(
                    _annotation['coordinates'].x,
                    _annotation['coordinates'].y,
                    _annotation['coordinates'].w,
                    _annotation['coordinates'].h,
                    !this.checkTargetAnnotation(annotation, _annotation)
                        ? '#dbdbdb'
                        : _annotation.color
                );
            });
        }
    }

    annotationOnMouseOut() {
        this.showOriginalImage();
    }

    findTargetAnnotation() {
        this.annotations[this.imageName].map((annotation) => {
            if (
                this.checkCloseEnough(
                    this.drawingPoint1.x,
                    annotation['coordinates'].x
                ) &&
                this.checkCloseEnough(
                    this.drawingPoint1.y,
                    annotation['coordinates'].y
                )
            ) {
                this.targetAnnotation = annotation;
                this.targetAnnotation['position'] = 'tl';

                this.isResizingBox = true;
            } else if (
                this.checkCloseEnough(
                    this.drawingPoint1.x,
                    annotation['coordinates'].x + annotation['coordinates'].w
                ) &&
                this.checkCloseEnough(
                    this.drawingPoint1.y,
                    annotation['coordinates'].y
                )
            ) {
                this.targetAnnotation = annotation;
                this.targetAnnotation['position'] = 'tr';

                this.isResizingBox = true;
            } else if (
                this.checkCloseEnough(
                    this.drawingPoint1.x,
                    annotation['coordinates'].x
                ) &&
                this.checkCloseEnough(
                    this.drawingPoint1.y,
                    annotation['coordinates'].y + annotation['coordinates'].h
                )
            ) {
                this.targetAnnotation = annotation;
                this.targetAnnotation['position'] = 'bl';

                this.isResizingBox = true;
            } else if (
                this.checkCloseEnough(
                    this.drawingPoint1.x,
                    annotation['coordinates'].x + annotation['coordinates'].w
                ) &&
                this.checkCloseEnough(
                    this.drawingPoint1.y,
                    annotation['coordinates'].y + annotation['coordinates'].h
                )
            ) {
                this.targetAnnotation = annotation;
                this.targetAnnotation['position'] = 'br';

                this.isResizingBox = true;
            }
        });
    }

    checkCloseEnough(p1, p2) {
        return Math.abs(p1 - p2) < 10;
    }

    checkTargetAnnotation(obj1, obj2) {
        if (this.isEmpty(obj1) || this.isEmpty(obj2)) return true;

        if (
            obj1.name === obj2.name &&
            obj1['coordinates'].x === obj2['coordinates'].x &&
            obj1['coordinates'].y === obj2['coordinates'].y &&
            obj1['coordinates'].w === obj2['coordinates'].w &&
            obj1['coordinates'].h === obj2['coordinates'].h
        )
            return false;

        return true;
    }

    showOriginalImage() {
        this.flushCanvas();

        this.selectedImage.focusX = this.selectedImage.width / 2;
        this.selectedImage.focusY = this.selectedImage.height / 2;

        this.resetLabelObj();
        this.showImage();
    }

    showImage() {
        let canvasCtx = this.canvas.getContext('2d');

        // canvasCtx.canvas.width = this.selectedImage.width;
        // canvasCtx.canvas.height = this.selectedImage.height;

        this.selectedImage.canx = 0;
        this.selectedImage.cany = 0;
        this.selectedImage.canw = this.canvas.width;
        this.selectedImage.canh = this.canvas.height;

        canvasCtx.drawImage(this.selectedImage, 0, 0);

        if (this.imageName in this.annotations) {
            this.annotations[this.imageName].map((annotation) => {
                if (
                    this.checkTargetAnnotation(
                        annotation,
                        this.targetAnnotation
                    )
                )
                    this.drawBox(
                        annotation['coordinates'].x,
                        annotation['coordinates'].y,
                        annotation['coordinates'].w,
                        annotation['coordinates'].h,
                        annotation.color
                    );
            });
        }
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

    drawBox(x, y, w, h, color) {
        let canvasCtx = this.canvas.getContext('2d');

        canvasCtx.strokeStyle = color;
        canvasCtx.strokeRect(x, y, w, h);

        canvasCtx.fillStyle = 'rgba(255,255,255,0.2)';
        canvasCtx.fillRect(x, y, w, h);

        // draw squares at each corner
        // upper left
        canvasCtx.strokeRect(x - 4, y - 4, 8, 8);
        // upper right
        canvasCtx.strokeRect(x + w - 4, y - 4, 8, 8);
        // lower left
        canvasCtx.strokeRect(x - 4, y + h - 4, 8, 8);
        // lower right
        canvasCtx.strokeRect(x + w - 4, y + h - 4, 8, 8);
    }

    flushCanvas() {
        let canvasCtx = this.canvas.getContext('2d');
        canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    resetLabelObjArr() {
        if (this.imageName in this.annotations) {
            this.annotations[this.imageName] = [];
        }
    }

    resetLabelObj() {
        // reset label object properties
        this.labelObject = {
            name: this.labelObject.name,
            color: this.labelObject.color,
        };
    }

    clearObj(obj) {
        // for enumerable and non-enumerable properties
        for (const prop of Object.getOwnPropertyNames(obj)) {
            delete obj[prop];
        }
    }

    setContainerOverflow(x: string, y: string) {
        this.overflowX = x;
        this.overflowY = y;
    }

    toBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });

    isEmpty(obj) {
        // null and undefined are "empty"
        if (obj == null) return true;

        // Assume if it has a length property with a non-zero value
        // that that property is correct.
        if (obj.length > 0) return false;
        if (obj.length === 0) return true;

        // If it isn't an object at this point
        // it is empty, but it can't be anything *but* empty
        // Is it empty?  Depends on your application.
        if (typeof obj !== 'object') return true;

        // Otherwise, does it have any properties of its own?
        // Note that this doesn't handle
        // toString and valueOf enumeration bugs in IE < 9
        for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) return false;
        }

        return true;
    }
}
