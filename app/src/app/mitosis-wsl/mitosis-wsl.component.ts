import { Component, OnInit } from '@angular/core';
import { NotificationsService } from 'angular2-notifications';
import { NgxSpinnerService } from 'ngx-spinner';
import { faQuestionCircle, faSearchPlus, faSearchMinus, faHome, faCut } from '@fortawesome/free-solid-svg-icons';
import { faExpandArrowsAlt } from '@fortawesome/free-solid-svg-icons';
import { environment } from 'src/environments/environment';
import { HttpClient, HttpHeaders, HttpRequest, HttpEventType } from '@angular/common/http';
import { Dictionary } from 'lodash';

declare var OpenSeadragon: any;
declare const fabric: any;
declare var $: any; // include JQuery

@Component({
  selector: 'app-mitosis-wsl',
  templateUrl: './mitosis-wsl.component.html',
  styleUrls: ['./mitosis-wsl.component.scss']
})
export class MitosisWslComponent implements OnInit {

  private BASE_URL = environment.API_URL;
  imageUploadFinished: boolean = false;
  retrivingSample: boolean = false;
  isImageLoaded: boolean = false;
  wslprediction: any;
  dzImages: any = [];
  systemMsg: any = '';
  selectedSample: any = null;
  image: any;
  imageName: any = '';
  uploadPercent: any;
  dziData: any = {};
  duomo: any;
  viewer: any;
  retrivingDetection: boolean= false;
  isImageDetected: boolean = false;

  // font awesome icons
  faSearchPlus = faSearchPlus;
  faSearchMinus = faSearchMinus;
  faHome = faHome;
  faExpandArrowsAlt = faExpandArrowsAlt;
  faCut = faCut;
  faQuestionCircle = faQuestionCircle;


  colorHash: Dictionary<string> = {
    MF: '#007bff',
    MFM: '#ffc107',
    MFA: '#28a745',
    MFgranular: '#dc3545',
    mitosis:'#007bff'
  };

  constructor(
    private http: HttpClient,
    private _spinner: NgxSpinnerService,
    private _notifications: NotificationsService
  ) { }

  ngOnInit(): void {
    this.fetchImagesList();
  }

  fetchImagesList() {
    this.http.get(`${this.BASE_URL}/mitosis/wholeslide`).subscribe(
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

  getDziData(){
    this.isImageDetected = false;
    this._spinner.show();
    this.systemMsg = 'retriving deep zooming image from server';
    this.retrivingSample = true;

    this.http.post(`${this.BASE_URL}/mitosis/wholeslide/retrievedata`, {
                name: this.selectedSample,
              })
      .subscribe(
                (res: any) => {
                    // let folderName = this.selectedSample.replace(/\s+/g, '_');
                    let folderName = this.selectedSample;
                    this.dziData = {
                        Url: `${this.BASE_URL}/public/mitosis/wsl/${folderName}/output/${this.selectedSample}_files/`,
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

  loadDzi(){
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
      }
    };

    // osd viewer
    this.viewer = OpenSeadragon({
      id: 'osdviewer',
      prefixUrl: '../../assets/openseadragon/images/',
      showNavigator: true,
      toolbar: 'osd-navbar',
    //   zoomInButton: 'zoom-in',
    //   zoomOutButton: 'zoom-out',
    //   homeButton: 'zoom-fit',
    //   fullPageButton: 'full-screen',
      tileSources: this.duomo,
      // debugMode:  true,
    });

    this.isImageLoaded = true;
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
    this.http.get(`${this.BASE_URL}/mitosis/dzi/status`, { headers: headers })
        .subscribe((res: any) => {
            // console.log(JSON.stringify(res));
            if (res.status === 'file is present') {
                this._spinner.hide();
                // let folderName = this.imageName.replace(/\s+/g, '_');
                let folderName = this.imageName;
                // let resData = JSON.parse(res.data);
                let resData = res.data;
                this.dziData = {
                    Url: `${this.BASE_URL}/public/mitosis/wsl/${folderName}/output/${this.imageName}_files/`,
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
                `${this.BASE_URL}/mitosis/dzi/upload`,
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
                            // let folderName = this.imageName.replace(
                            //     /\s+/g,
                            //     '_'
                            // );
                            let folderName = this.imageName;
                            this.dziData = {
                                Url: `${this.BASE_URL}/public/mitosis/wsl/${folderName}/output/${this.imageName}_files/`,
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


  onDetectClick(){
    this.retrivingDetection = true;
    this._spinner.show();
    this.systemMsg = 'retriving wsi detection results from server';
    this.http.post<any>(`${this.BASE_URL}/mitosis/detectwsl/`, {
                name: this.selectedSample,
      })
      .subscribe(
        (res) => {
            this.wslprediction = res.all_detections;      
            console.log(this.wslprediction)
            this.drawOnOSD();
            this.isImageDetected = true;
            this.retrivingDetection = false;
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

  }
  drawOnOSD(){
    
    $('#osdviewer').empty();
    // osd viewer
    this.viewer = OpenSeadragon({
      id: 'osdviewer',
      prefixUrl: '../../assets/openseadragon/images/',
      showNavigator: true,
      tileSources: this.duomo,
      toolbar: 'osd-navbar',
    //   zoomInButton: 'zoom-in',
    //   zoomOutButton: 'zoom-out',
    //   homeButton: 'zoom-fit',
    //   fullPageButton: 'full-screen',
      // debugMode:  true,
    });

    var options = {
      scale: this.dziData.Size.Width,
      static: true
    }
    var overlay = this.viewer.fabricjsOverlay(options);
    for(let i=0;i < this.wslprediction.length; i++) {  
        console.log(i)  
        var name = this.wslprediction[i].name
        var detections = this.wslprediction[i].detections
        var name1 = name.split(".")
        var res= name1[0].split("_")
        let defaultWidth = 800* Number(res[0])
        let defaultHeight = 800*Number(res[1])

        for (let j=0; j< detections.length; j++){
            const box = detections[j][2]
            const cellname = detections[j][0]
            
            var xx = box[0]-box[2]/2  + defaultWidth;
            var yy = box[1]-box[3]/2 + defaultHeight;
            var w = box[2];
            var h = box[3];

            if (w >= 800 || h >= 800){
              continue
            }

            // Add fabric rectangle
            var rect = new fabric.Rect({
                // left: xx,
                // top: yy,
                hasBorder: true,
                stroke: this.colorHash[cellname],
                strokeWidth: 3,
                fill:'transparent',
                width: w,
                height: h,
                originY: "bottom"
            });

            var text = new fabric.Text(cellname, { 
                fill: "white",
                fontSize: 20,
                originY: "top"
            }); 

            var group = new fabric.Group([rect, text], {
                left: xx,
                top: yy
            });
      

            overlay.fabricCanvas().add(group);
           
        }
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

}
