import { Component, OnInit } from '@angular/core';
import { Dictionary } from 'lodash';
import { HttpClient } from '@angular/common/http';

import { environment } from 'src/environments/environment';
import { NotificationsService } from 'angular2-notifications';
import { NgxSpinnerService } from 'ngx-spinner';

declare var $: any; // include jquery

@Component({
    selector: 'app-annotatorv2',
    templateUrl: './annotatorv2.component.html',
    styleUrls: ['./annotatorv2.component.scss'],
})
export class Annotatorv2Component implements OnInit {
    private BASE_URL = environment.API_URL;

    constructor(
        private http: HttpClient,
        private _spinner: NgxSpinnerService,
        private _notifications: NotificationsService
    ) {}

    ngOnInit(): void {
        var obj = {};
        var models = [];
        var datasets = [];
        var file;
        var dnd = 0;
        var zipFile = {};
        var otherLabels = [];
        var doneLabels = [];
        var predictedLabel = '';
        var canvas = <HTMLCanvasElement>(
            document.getElementById('od-new-img-canvas')
        );
        var ctx = canvas.getContext('2d');
        var canvasImgSrc = '';
        var annotations = {};
        var squares = [];
        var imgList = [];
        var dtLabelList = [];
        var canvasMouseMode = 'new';
        var targetCanvasAnnotation = { id: 0, label: '', w: 0, h: 0 };
        var input_key_buffer = [];
        var gridMode = true;
        var labelMode = true;
        var viewMode = true;
        var objectDetectionResultAnnotations = [];

        $(document).ready(function () {
            var x = 0;
            var y = 0;
            var _x;
            var _y;

            // draw label
            $('#od-new-img-canvas').mousedown(function (e) {
                var labelId = $('.dt-label.active').attr('data-id');
                if (labelId != null && labelId.length > 0) {
                    var railhead = e.target.getBoundingClientRect();
                    x = e.clientX - railhead.left;
                    y = e.clientY - railhead.top;
                    _x = x;
                    _y = y;
                    canvasMouseMode = 'new';
                    for (var i = 0; i < squares.length; i++) {
                        var sq = squares[i];
                        if (
                            x < sq.x + 4 &&
                            x > sq.x - 4 &&
                            y < sq.y + 4 &&
                            y > sq.y - 4
                        ) {
                            x = sq.s_x;
                            y = sq.s_y;
                            console.log('detect');
                            canvasMouseMode =
                                sq.type == 'square'
                                    ? 'edit'
                                    : sq.type == 'center'
                                    ? 'move'
                                    : 'new';
                            targetCanvasAnnotation = {
                                id: sq.id,
                                label: sq.label,
                                w: sq.w,
                                h: sq.h,
                            };
                            break;
                        }
                    }

                    $('#od-new-img-canvas').bind('mousemove', function (e) {
                        var railhead = e.target.getBoundingClientRect();
                        _x = e.clientX - railhead.left;
                        _y = e.clientY - railhead.top;
                        var thisRect =
                            canvasMouseMode == 'move'
                                ? [
                                      _x - targetCanvasAnnotation.w / 2,
                                      _y - targetCanvasAnnotation.h / 2,
                                      targetCanvasAnnotation.w,
                                      targetCanvasAnnotation.h,
                                  ]
                                : [x, y, _x - x, _y - y];
                        initCanvas(null, thisRect);
                    });
                } else {
                    alert(
                        'No Label detected. Please create some Labels at first.'
                    );
                }
            });

            $(document).on('click', '.dt-label:not(.active)', function () {
                $('.dt-label').removeClass('active');
                $(this).addClass('active');
            });

            $('#od-new-img-canvas').mouseup(function () {
                $('#od-new-img-canvas').unbind('mousemove');
                var targetFile = $('#od-new-img-canvas').attr('data-file');
                var ww;
                var hh;
                var xx;
                var yy;
                if (canvasMouseMode == 'move') {
                    xx = _x - targetCanvasAnnotation.w / 2;
                    yy = _y - targetCanvasAnnotation.h / 2;
                    ww = targetCanvasAnnotation.w;
                    hh = targetCanvasAnnotation.h;
                } else {
                    xx = x;
                    yy = y;
                    ww = _x - x;
                    hh = _y - y;
                }
                createLabelAnnotation(targetFile, xx, yy, ww, hh);
            });

            // add new label
            $(document).on(
                'click',
                '.od-new-label-button:not(.disabled)',
                function () {
                    $('#newDtLabelName').val('');
                    $('#mymodal2').modal('show');
                }
            );

            // add new label

            $(document).on(
                'click',
                '.new-dt-label-btn:not(.disabled)',
                function () {
                    var labelName = $('#newDtLabelName').val();
                    if (dtLabelList.indexOf(labelName) == -1) {
                        newDtLabel(labelName);
                    } else {
                        alert('Label "' + labelName + '" is already existed.');
                    }
                }
            );

            // edit the label name

            $(document).on(
                'click',
                '.edit-dt-label:not(.disabled)',
                function () {
                    $('#changeDtLabelName').val(
                        dtLabelList[$(this).attr('data-id')]
                    );
                    $('#changeDtLabelId').val($(this).attr('data-id'));
                    $('#mymodal3').modal('show');
                }
            );

            // change label name

            $(document).on(
                'click',
                '.change-dt-label-btn:not(.disabled)',
                function () {
                    var labelName = $('#changeDtLabelName').val();
                    var labelId = $('#changeDtLabelId').val();
                    if (
                        dtLabelList.indexOf(labelName) == -1 ||
                        dtLabelList.indexOf(labelName) == labelId
                    ) {
                        changeDtLabel(labelId, labelName);
                    } else {
                        alert('Label "' + labelName + '" is already existed.');
                    }
                }
            );

            // delete label
            $(document).on(
                'click',
                '.del-dt-label:not(.disabled)',
                function () {
                    if (window.confirm('Are you sure you want to delete it?')) {
                        delDtLabel($(this).attr('data-id'));
                    }
                }
            );

            $(document).on(
                'click',
                '.del-label-annotation:not(.disabled)',
                function () {
                    delLabelAnnotation($(this).attr('data-id'));
                }
            );

            // upload image
            $(document).on('click', '.btn-open-file', function () {
                $('#dummy-nod-files').click();
            });

            $(document).on('change', '#dummy-nod-files', function (e) {
                uploadedImgFiles(e.target);
            });

            $(window).on('resize', function () {
                initCanvas(null, false);
            });

            $(document).on('mouseover', '.label-annotation-area', function () {
                var elm = $(this);
                //console.log(elm.attr('data-id'));
                initCanvas(elm.attr('data-id'), false);
            });

            $(document).on('mouseout', '.label-annotation-area', function () {
                initCanvas(null, false);
            });

            $(document).on(
                'click',
                '.od-new-img-select:not(.disabled)',
                function () {
                    $('.od-new-img-select').removeClass('active');
                    $(this).addClass('active');
                    canvasImgSrc = $(this).attr('data-url');
                    $('#od-new-img-canvas').attr(
                        'data-file',
                        $(this).attr('data-file')
                    );
                    renderLabelAnnotations($(this).attr('data-file'));
                    resetSquares($(this).attr('data-file'));
                    initCanvas(null, false);
                }
            );

            $(document).on(
                'click',
                '.label-annotation:not(.disabled)',
                function () {
                    var fileName = $('#od-new-img-canvas').attr('data-file');
                    var annId = $(this).attr('data-id');
                    if (fileName && annId) {
                        var labelId = annotations[fileName][annId].label;
                        $('#changeAnnotationFile').val(fileName);
                        $('#changeAnnotationId').val(annId);
                        $('#changeAnnotationLabelId').empty();
                        var ih = '';
                        for (var i = 0; i < dtLabelList.length; i++) {
                            var selected =
                                labelId == dtLabelList[i] ? ' selected' : '';
                            ih +=
                                '<option value="' +
                                dtLabelList[i] +
                                '"' +
                                selected +
                                '>' +
                                dtLabelList[i] +
                                '</option>';
                        }
                        $('#changeAnnotationLabelId').append(ih);
                        $('#mymodal4').modal('show');
                    }
                }
            );

            $(document).on('change', '#changeAnnotationLabelId', function () {
                changeLabelAnnotation();
            });
        });

        function changeLabelAnnotation() {
            var fileName = $('#changeAnnotationFile').val();
            var annId = $('#changeAnnotationId').val();
            var labelId = $('#changeAnnotationLabelId').val();
            annotations[fileName][annId].label = labelId;
            renderLabelAnnotations(fileName);
            $('#mymodal4').modal('hide');
            initCanvas(null, false);
            checkAnnotationCount();
        }

        function newDtLabel(labelName) {
            dtLabelList.push(labelName);
            renderLabelList(true);
            $('#mymodal2').modal('hide');
        }

        function renderLabelList(updated) {
            $('#od-new-img-dt-label-list').empty();
            for (var i = 0; i < dtLabelList.length; i++) {
                var label = dtLabelList[i];
                $('#od-new-img-dt-label-list').append(elmDtLabel(i, label));
            }
            if ($('.dt-label.active').length == 0) {
                var ntarget = updated ? 'last' : 'first';
                $('.dt-label:' + ntarget).addClass('active');
            }
        }

        function elmDtLabel(i, label) {
            var ret =
                '<button class="btn btn-default dt-label" data-id="' +
                label +
                '">' +
                '<span>' +
                label +
                '</span><span id="dt-label-count-' +
                i +
                '"></span>' +
                '<span><a href="#" class="edit-dt-label" data-id="' +
                i +
                '"> <i class="fa fa-pencil" aria-hidden="true"></i></a></span>' +
                '<span><a href="#" class="del-dt-label" data-id="' +
                i +
                '"> <i class="fa fa-times" aria-hidden="true"></i></a></span>' +
                '</button>';

            return ret;
        }

        function changeDtLabel(labelId, labelName) {
            var orgLabelName = dtLabelList[labelId];
            dtLabelList[labelId] = labelName;
            renderLabelList(false);
            changeAnnotationLabel(orgLabelName, labelName);
            $('#mymodal3').modal('hide');
        }

        function delDtLabel(id) {
            dtLabelList.splice(id, 1);
            resetAnnotations();
            renderLabelList(false);
            initCanvas(null, false);
        }

        function changeAnnotationLabel(orgLabel, newLabel) {
            for (var key in annotations) {
                if (annotations.hasOwnProperty(key)) {
                    var anns = annotations[key];
                    var annSize = anns.length;
                    for (var i = 0; i < annSize; i++) {
                        var ann = anns[i];
                        if (ann.label == orgLabel)
                            annotations[key][i].label = newLabel;
                    }
                }
            }
            renderLabelAnnotations($('#od-new-img-canvas').attr('data-file'));
        }

        function delLabelAnnotation(id) {
            var targetFile = $('#od-new-img-canvas').attr('data-file');
            var anns = annotations[targetFile];
            anns.splice(id, 1);
            renderLabelAnnotations(targetFile);
            checkAnnotationCount();
            initCanvas(null, false);
        }

        function resetAnnotations() {
            for (var key in annotations) {
                if (annotations.hasOwnProperty(key)) {
                    var anns = annotations[key];
                    var newList = [];
                    for (var i = 0; i < anns.length; i++) {
                        var ann = anns[i];
                        if (
                            dtLabelList[ann.label] != null &&
                            dtLabelList[ann.label].length > 1
                        ) {
                            newList.push(ann);
                        }
                    }
                    annotations[key] = newList;
                }
            }
        }

        function uploadedImgFiles(dataTransfer) {
            if (dataTransfer && dataTransfer.files.length) {
                //imgList = [];
                for (var i = 0; i < dataTransfer.files.length; i++) {
                    var file = dataTransfer.files[i];
                    var fileName = file.name;
                    var reader = new FileReader();
                    reader.onload = (function (theFile, theFileName) {
                        return function (e) {
                            console.log('File type: ' + theFile.type);
                            if (theFile.type.match('image.*')) {
                                //
                                // Image file
                                //
                                var b64 = e.target.result.split(',')[1];
                                console.log('Filename: ' + theFileName);
                                console.log('length: ' + b64.length);
                                var res = majax(
                                    {
                                        auth: obj,
                                        fileName: theFileName,
                                        b64: b64,
                                    },
                                    'save',
                                    function (dat) {
                                        console.log(dat);
                                        addImgElement(dat);
                                        odNewsSelectImg(dat);
                                    }
                                );
                            }
                        };
                    })(file, fileName);
                    reader.readAsDataURL(file);
                }
            }
        }

        function majax(data0, target, callback) {
            startLoading();
            $.ajax({
                type: 'POST',
                data: JSON.stringify(data0),
                contentType: 'application/json',
                url: 'http://localhost:8080' + '/' + target,
                success: function (data) {
                    stopLoading();
                    if (
                        (data.error && data.error.length > 1) ||
                        (data.errorCode && data.errorCode.length > 1)
                    ) {
                        window.setTimeout(function () {
                            alert(data.error + ' : ' + data.error_description);
                        }, 100);
                    } else {
                        if (data && data.message && data.message.length > 0) {
                            alert('API message : ' + data.message);
                        }
                        callback(data);
                    }
                },
                error: function (req, status, err) {
                    stopLoading();
                    window.setTimeout(function () {
                        alert('ERROR! : ' + status + ' : ' + err.message);
                    }, 100);
                },
            });
        }

        function addImgElement(dat) {
            var thisUrl = 'http://localhost:8080' + '/spool/' + dat;
            var dom =
                '<a href="#" class="thumbnail od-new-img-select" data-file="' +
                dat +
                '" data-url="' +
                thisUrl +
                '">' +
                '<img id="od-new-img-e-' +
                dat +
                '" src="' +
                thisUrl +
                '"/>' +
                '<div class="caption"><h4>' +
                dat +
                '</h4></div>' +
                '</a>';
            if (imgList.indexOf(dat) == -1) {
                imgList.push(dat);
                $('#od-new-img-t-list').append(dom);
                annotations[dat] = [];
            }
        }

        function odNewsSelectImg(dat) {
            $('.od-new-img-select[data-file="' + dat + '"]').click();
        }

        function startLoading() {
            $('#myloading').removeClass('hidden');
        }

        function stopLoading() {
            $('#myloading').addClass('hidden');
        }

        function initCanvas(focusId, selecting) {
            if (canvasImgSrc != null && canvasImgSrc.length > 2) {
                var img = new Image();
                img.onload = function () {
                    var tw, th;
                    if (viewMode) {
                        tw = $('#od-new-img-canvas').parent().width();
                        th = (tw * img.height) / img.width;
                    } else {
                        th = window.innerHeight - 260;
                        tw = (th * img.width) / img.height;
                    }
                    $('#dt-create-canvas-container').css('height', th + 'px');
                    $('#od-new-img-canvas').attr('data-img-width', img.width);
                    $('#od-new-img-canvas').attr('data-img-height', img.height);
                    canvas.width = tw;
                    canvas.height = th;
                    ctx.drawImage(img, 0, 0, tw, th);

                    // if (gridMode) drawGrid(tw, th, ctx);

                    var targetFile = $('#od-new-img-canvas').attr('data-file');
                    var anns = annotations[targetFile];
                    if (anns != null) {
                        for (var i = 0; i < anns.length; i++) {
                            var color =
                                focusId && focusId == i
                                    ? 'rgb(208,52,132)'
                                    : canvasMouseMode == 'edit' &&
                                      targetCanvasAnnotation.id == i
                                    ? 'rgb(160,255,0)'
                                    : 'rgb(160,255,0)';
                            var ann = anns[i];
                            mystrokeRect(
                                convImg2Canvas(ann.x) + 0.5,
                                convImg2Canvas(ann.y) + 0.5,
                                convImg2Canvas(ann.width),
                                convImg2Canvas(ann.height),
                                color,
                                true,
                                ann.label
                            );
                        }
                    }
                    if (selecting) {
                        var color = 'rgb(208,52,132)';
                        mystrokeRect(
                            selecting[0],
                            selecting[1],
                            selecting[2],
                            selecting[3],
                            color,
                            null,
                            null
                        );
                    }
                };
                img.src = canvasImgSrc;
            }
        }

        function mystrokeRect(x, y, w, h, color, expand, label) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, w, h);
            if (expand) {
                if (labelMode && label && label.length > 0) {
                    ctx.font = '15px Arial';
                    ctx.fillStyle = 'rgba(0, 0, 0, .5)';
                    var wi = ctx.measureText(label).width;
                    ctx.fillRect(x, y - 20, wi + 10, 20);
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = color;
                    ctx.fillText(label, x + 5, y - 10);
                }

                var target = [
                    [x, y],
                    [x, y + h],
                    [x + w, y],
                    [x + w, y + h],
                ];
                for (var i = 0; i < target.length; i++) {
                    var t_x = target[i][0];
                    var t_y = target[i][1];
                    ctx.strokeRect(t_x - 4, t_y - 4, 8, 8);
                }

                ctx.beginPath();
                ctx.moveTo(x + w / 2 - 5, y + h / 2);
                ctx.lineTo(x + w / 2 + 5, y + h / 2);
                ctx.closePath();
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + w / 2, y + h / 2 - 5);
                ctx.lineTo(x + w / 2, y + h / 2 + 5);
                ctx.closePath();
                ctx.stroke();
            }
        }

        function convImg2Canvas(x) {
            var imgWidth = $('#od-new-img-canvas').attr('data-img-width');
            var canvasWidth = canvas.width;
            return (x * canvasWidth) / imgWidth;
        }

        function convCanvas2Img(x) {
            var imgWidth = $('#od-new-img-canvas').attr('data-img-width');
            var canvasWidth = canvas.width;
            return (x * imgWidth) / canvasWidth;
        }

        function createLabelAnnotation(targetFile, x, y, w, h) {
            var anns = annotations[targetFile];
            if (anns == null) {
                annotations[targetFile] = [];
            }
            var xx = w < 0 ? x + w : x;
            var yy = h < 0 ? y + h : y;
            var ww = Math.abs(w);
            var hh = Math.abs(h);
            var obj = {
                x: convCanvas2Img(xx),
                y: convCanvas2Img(yy),
                width: convCanvas2Img(ww),
                height: convCanvas2Img(hh),
                label: '',
            };
            if (canvasMouseMode == 'edit') {
                obj.label = targetCanvasAnnotation.label;
                if (ww > 2 && hh > 2) {
                    annotations[targetFile][targetCanvasAnnotation.id] = obj;
                }
            } else if (canvasMouseMode == 'move') {
                obj.label = targetCanvasAnnotation.label;
                // if (shiftKey){
                //   annotations[targetFile].push(obj);
                // } else {
                //   annotations[targetFile][targetCanvasAnnotation.id] = obj;
                // }
            } else if (canvasMouseMode == 'new') {
                var labelId = $('.dt-label.active').attr('data-id');
                if (labelId && ww > 2 && hh > 2) {
                    obj.label = labelId;
                    annotations[targetFile].push(obj);
                }
            }
            canvasMouseMode = 'new';
            resetSquares(targetFile);
            renderLabelAnnotations(targetFile);
            initCanvas(null, false);
            checkAnnotationCount();
        }

        function checkAnnotationCount() {
            var falseCount = 0;
            var count = {};
            for (var i = 0; i < dtLabelList.length; i++) {
                count[dtLabelList[i]] = 0;
            }
            for (var key in annotations) {
                if (annotations.hasOwnProperty(key)) {
                    var anns = annotations[key];
                    for (var i = 0; i < anns.length; i++) {
                        var ann = anns[i];
                        count[ann.label] += 1;
                    }
                }
            }
            for (var i = 0; i < dtLabelList.length; i++) {
                var thisCount = count[dtLabelList[i]];
                $('#dt-label-count-' + i).text(' (' + thisCount + ')');
                if (thisCount < 1) {
                    falseCount++;
                }
            }
            if (falseCount == 0) {
                if ($('#create-dt-model-btn').hasClass('disabled')) {
                    $('.save-complete-btn').removeClass('disabled');
                }
            } else {
                if (!$('#create-dt-model-btn').hasClass('disabled')) {
                    $('.save-complete-btn').addClass('disabled');
                }
            }
        }

        function renderLabelAnnotations(targetFile) {
            var anns = annotations[targetFile];
            $('#od-new-img-label-list').empty();
            if (anns != null) {
                for (var i = 0; i < anns.length; i++) {
                    var ann = anns[i];
                    //console.log(ann);
                    $('#od-new-img-label-list').append(
                        elmLabelAnnotaion(i, ann)
                    );
                }
            }
        }

        function elmLabelAnnotaion(i, ann) {
            var ret =
                '<div class="label-annotation-area" data-id="' +
                i +
                '">' +
                '<span class="badge label-annotation" data-id="' +
                i +
                '">' +
                '<span>' +
                ann.label +
                '</span>' +
                '</span>' +
                '<span><a href="#" class="del-label-annotation" data-id="' +
                i +
                '"> <i class="fa fa-times" aria-hidden="true"></i></a></span>' +
                '</div>';
            return ret;
        }

        function resetSquares(key) {
            squares = [];
            var anns = annotations[key];
            for (var i = 0; i < anns.length; i++) {
                var ann = anns[i];
                var x = convImg2Canvas(ann.x);
                var y = convImg2Canvas(ann.y);
                var w = convImg2Canvas(ann.width);
                var h = convImg2Canvas(ann.height);
                var label = ann.label;
                squares.push({
                    x: x,
                    y: y,
                    s_x: x + w,
                    s_y: y + h,
                    label: label,
                    file: key,
                    id: i,
                    type: 'square',
                });
                squares.push({
                    x: x,
                    y: y + h,
                    s_x: x + w,
                    s_y: y,
                    label: label,
                    file: key,
                    id: i,
                    type: 'square',
                });
                squares.push({
                    x: x + w,
                    y: y,
                    s_x: x,
                    s_y: y + h,
                    label: label,
                    file: key,
                    id: i,
                    type: 'square',
                });
                squares.push({
                    x: x + w,
                    y: y + h,
                    s_x: x,
                    s_y: y,
                    label: label,
                    file: key,
                    id: i,
                    type: 'square',
                });
                squares.push({
                    x: x + w / 2,
                    y: y + h / 2,
                    s_x: x,
                    s_y: y,
                    w: w,
                    h: h,
                    label: label,
                    file: key,
                    id: i,
                    type: 'center',
                });
            }
        }
    }
}
