import flask
from flask import Flask, request, Response, jsonify, send_from_directory, abort
from flask_cors import CORS, cross_origin
from flask_restful import Resource, Api
import os
import re
import cv2
import base64
import darknet
from darknet import load_net,detect,load_meta
import simplejson as json
import xmltodict
from datetime import timedelta
import pyvips
from PIL import Image
import math

# net = load_net(b"brainmodels/basemodel/yolov3.cfg", b"brainmodels/basemodel/yolov3.weights", 0)
# meta = load_meta(b"brainmodels/basemodel/coco.data")

# net = load_net(b"brainmodels/basemodel/yolo-obj.cfg", b"brainmodels/basemodel/yolo-obj.backup", 0)
# meta = load_meta(b"brainmodels/basemodel/obj.data")

net = load_net(b"brainmodels/basemodel_0816/yolov3_custom.cfg", b"brainmodels/basemodel_0816/yolov3_custom_pathology_best.weights", 0)
meta = load_meta(b"brainmodels/basemodel_0816/detector.data")

app = flask.Flask(__name__, static_folder='./public')
api = Api(app)
CORS(app)

@app.route('/')
def Hello():
    return "Hello World"

@app.route('/brain/segmented')
def get_brain_segmented_list():
    files = os.listdir('public/brain/segmented')
    return jsonify({"files":files})

@app.route('/brain/models')
def get_brain_detection_model():
    files = os.listdir('brainmodels')
    return jsonify({"files":files})

@app.route('/brain/wholeslide')
def get_brain_wsl_list():
    files = os.listdir('public/brain/wsl')
    return jsonify({"files":files})

@app.route('/brain/labeled')
def get_labeled_brainimg():
    files = os.listdir('public/brain/labeled/objects')   
    return jsonify({"files":files})

@app.route('/mitosis/segmented')
def get_mitosis_segmented_list():
    files = os.listdir('public/mitosis/segmented')
    return jsonify({"files":files})

@app.route('/mitosis/models')
def get_brain_detection_model():
    files = os.listdir('mitosismodels')
    return jsonify({"files":files})

@app.route('/mitosis/wholeslide')
def get_brain_wsl_list():
    files = os.listdir('public/mitosis/wsl')
    return jsonify({"files":files})

@app.route('/ki67')
def get_ki67_list():
    files = os.listdir('public/ki67')
    return jsonify({"files":files})


@app.route('/brain/detections',methods = ['POST'])
def get_detections():
    print("Detect image")
    image = request.files['file']
    image.save(os.path.join(os.getcwd(), "public/brain/segmented/"+ image.filename))
    # image_path = bytes("public/brain/segmented/"+image.filename, encoding='utf-8')
    # im = Image.open(image_path)
    img = Image.open("public/brain/segmented/"+image.filename)
    column = math.ceil(img.size[0]/800)
    row = math.ceil(img.size[1]/800)
    new_image = Image.new('RGB', (800*column,800*row), (128, 128, 128)) 
    new_image.paste(img, (0, 0)) 

    detection_results = []
    for i in range(row):
        for j in range(column):
            res = {}
            res['name'] = "%d_%d.jpg"%(i,j)     
            box = (j*800, i*800, j*800+800, i*800+800)
            tile = new_image.crop(box)
            tile.save("public/brain/cropped/%s_%d_%d.jpg"%(image.filename,i,j))
            path = bytes("public/brain/cropped/%s_%d_%d.jpg"%(image.filename,i,j), encoding='utf-8')
            r = detect(net,meta, path)
            res['detections'] = r
            detection_results.append(res)
            os.remove(path)
    
    response = {
        "code":200,
        "message": "prediction result retrived",
        "prediction": {
            "name": image.filename,
            "detections":detection_results
        } 
    }

    print(response)

    try:
        return response
    except FileNotFoundError:
        abort(404)


@app.route('/brain/wholeslide/retrievedata',methods = ['POST'])
def retrieve_data():
    fileName = request.get_json()["name"]
    print(fileName)
    
    with open("public/brain/wsl/%s/output/%s.dzi"%(fileName,fileName)) as xml_file:       
        data_dict = xmltodict.parse(xml_file.read()) 
        print(data_dict)
        Format = data_dict['Image']['@Format']
        Overlap = data_dict['Image']['@Overlap']
        TileSize = data_dict['Image']['@TileSize']
        Width = data_dict['Image']['Size']['@Width']
        Height = data_dict['Image']['Size']['@Height']

        xml_file.close() 

    response = {
        "Format": Format,
        "Overlap": Overlap,
        "TileSize":TileSize,
        "Width": Width,
        "Height":Height
    }  
      
    
    return response

@app.route('/mitosis/wholeslide/retrievedata',methods = ['POST'])
def retrieve_data():
    fileName = request.get_json()["name"]
    print(fileName)
    
    with open("public/mitosis/wsl/%s/output/%s.dzi"%(fileName,fileName)) as xml_file:       
        data_dict = xmltodict.parse(xml_file.read()) 
        print(data_dict)
        Format = data_dict['Image']['@Format']
        Overlap = data_dict['Image']['@Overlap']
        TileSize = data_dict['Image']['@TileSize']
        Width = data_dict['Image']['Size']['@Width']
        Height = data_dict['Image']['Size']['@Height']

        xml_file.close() 

    response = {
        "Format": Format,
        "Overlap": Overlap,
        "TileSize":TileSize,
        "Width": Width,
        "Height":Height
    }  
      
    
    return response


@app.route('/brain/detectwsl/',methods = ['POST'])
def get_wsl_detections():
    fileName = request.get_json()["name"]

    # check if detection result exists
    if (os.path.exists('./public/brain/wsldetections/' + fileName + '.json')):
    
        with open('./public/brain/wsldetections/' + fileName + '.json') as json_file:       
            response = json_file.read()

        json_file.close() 

        return response

    path = "public/brain/wsl/%s/output/%s_files"%(fileName,fileName)
    tiles = os.listdir(path)
    tiles_list = list(map(int,tiles))
    print(tiles_list)
    print("max(tiles)",max(tiles_list))
    sub_path = path +'/'+ str(max(tiles_list))
    tileimages = os.listdir(sub_path)

    # color = {"oligo": (255,0,0), "AC": (0,0,255),"endo":(0,255,0),"neuron":(255,0,255),"undetermined":(0,0,0)}
    
    detection_results = []
    for tile in tileimages:
        res = {}
        res['name'] = tile
        tile_path = bytes(sub_path+'/'+tile, encoding='utf-8')
        print(tile_path)
        r = detect(net,meta, tile_path)
        res['detections'] = r
        detection_results.append(res)


    response = {
        "name": fileName,
        "all_detections": detection_results
    }

    json_data = json.dumps(response)           
    with open("public/brain/wsldetections/" + fileName + '.json', "w",encoding='utf-8') as json_file:
        json_file.write(json_data)
        json_file.close()

    return response

@app.route('/brain/labeled/save', methods = ['POST'])
def save_labeled_brainimg():
    try:
        req = request.get_json()["data"]
        for i in range(len(req)):
            fileName = req[i]['name']
            result = re.search("data:image/(?P<ext>.*?);base64,(?P<data>.*)", req[i]['src'], re.DOTALL)
            data = result.groupdict().get("data")          
            imgdata = base64.b64decode(data)
            with open("public/brain/labeled/original/"+ fileName, 'wb') as f:
                f.write(imgdata)
            tmp = {
                "created": request.get_json()["created"],
                "name": fileName,
                "data": req[i]['data']
            }   
            json_data = json.dumps(tmp)           
            with open("public/brain/labeled/objects/"+ fileName + '.json', "w") as json_file:
                json_file.write(json_data)
                json_file.close()

        response = {
            "code": 200,
            "message": "created"
        } 
    except:
        response = {
            "code": 500,
            "message": "error"
        } 
          
    return response


@app.route('/brain/retraining/save',methods = ['POST'])
def save_retraining_info():
    try:
        req = request.get_json()["data"]
        created = request.get_json()["created"]
    
        json_data = json.dumps(req)  
        with open("public/brain/relearning/"+ str(created) + '.json', "w") as json_file:
            json_file.write(json_data)
            json_file.close()
        
        response = {
            "code": 200,
            "message": "created"
        } 
    
    except:
        response = {
            "code": 500,
            "message": "error"
        } 
    return response


wsl_uploads = {}
@app.route('/brain/dzi/status',methods = ['GET'])
def get_brain_dzi_status():
    # storagePath = os.path.join(os.getcwd(), "public/brain/wsl/")
    storagePath = os.path.join("./public/brain/wsl/")
    fileId = request.headers.get("x-file-id")
    fileName = request.headers.get("name")   
    fileSize = int(request.headers["size"])

    if (os.path.exists('./public/brain/wsl/' + fileName + '/output/' + fileName + '.dzi')):
        print("%s exists on server, start retrieving file"%fileName)

        with open("./public/brain/wsl/%s/"%fileName + "/output/%s.dzi"%fileName) as xml_file:       
            data_dict = xmltodict.parse(xml_file.read()) 
            print(data_dict)
            Format = data_dict['Image']['@Format']
            Overlap = data_dict['Image']['@Overlap']
            TileSize = data_dict['Image']['@TileSize']
            Width = data_dict['Image']['Size']['@Width']
            Height = data_dict['Image']['Size']['@Height']

        xml_file.close() 

        response = {
            'status': 'file is present',
            'data': {
                "Format": Format,
                "Overlap": Overlap,
                "TileSize":TileSize,
                "Width": Width,
                "Height":Height
            }
        }

        return response

    if fileName:
        try:
            foldername = fileName
            # wsl_file = os.path.join(os.getcwd(), "public/brain/wsl/%s/%s/"%foldername%fileName)
            wsl_file = os.path.join("./public/brain/wsl/%s/%s"%foldername%fileName)
            
            if wsl_file.is_file():
                stats = os.stat(wsl_file)          
                print(datetime.now() + ": file size is %s"%fileSize + "and already uploaded file size %s"%stats.st_size)

                if not wsl_uploads.has_key(fileId):
                    wsl_uploads[fileId] = {}
                
                wsl_uploads[fileId]["bytesReceived"] = stats.st_size; 
                print(datetime.now()+"uploaded amount is %s"%stats.size)
            else:
                print('NOT A FILE')
        except:
            print("error")


    if fileId not in wsl_uploads:
        wsl_uploads[fileId] = {}

    upload = wsl_uploads[fileId]
    if upload:
        response = { "uploaded": upload.bytesReceived }
    else:
        response = { "uploaded": 0}
    print(response)

    return response



@app.route('/brain/dzi/upload', methods = ['POST'])
def upload_brainwsl():
    fileName = request.headers["name"]
    # foldername = re.sub(r'[^\w]', '_',fileName)
    foldername = fileName

    uploadPath = os.path.join(os.getcwd(), "public/brain/wsl/%s/"%foldername)
    if not os.path.exists(uploadPath):
        os.makedirs(uploadPath)

    fileFullPath = os.path.join(uploadPath, fileName)
    
    with open(fileFullPath, "wb") as f:
        chunk_size = 4096
        while True:
            chunk = request.stream.read(chunk_size)
            if len(chunk) == 0:
                break
            f.write(chunk)

    savePath = os.path.join(uploadPath, "output")
    if not os.path.exists(savePath):
        os.makedirs(savePath)

    img = pyvips.Image.new_from_file(fileFullPath, access='sequential')
    img.dzsave(savePath+"/%s"%fileName, overlap=0, tile_size=800)


    with open(savePath + "/%s.dzi"%fileName) as xml_file:       
        data_dict = xmltodict.parse(xml_file.read()) 
        print(data_dict)
        Format = data_dict['Image']['@Format']
        Overlap = data_dict['Image']['@Overlap']
        TileSize = data_dict['Image']['@TileSize']
        Width = data_dict['Image']['Size']['@Width']
        Height = data_dict['Image']['Size']['@Height']

        xml_file.close() 

    response = {
        "Format": Format,
        "Overlap": Overlap,
        "TileSize":TileSize,
        "Width": Width,
        "Height":Height
    }  
 
    return response



mitosis_wsl_uploads = {}
@app.route('/mitosisdzi/status',methods = ['GET'])
def get_mitosis_dzi_status():
    # storagePath = os.path.join(os.getcwd(), "public/brain/wsl/")
    storagePath = os.path.join("./public/mitosis/wsl/")
    fileId = request.headers.get("x-file-id")
    fileName = request.headers.get("name")   
    fileSize = int(request.headers["size"])

    if (os.path.exists('./public/mitosis/wsl/' + fileName + '/output/' + fileName + '.dzi')):
        print("%s exists on server, start retrieving file"%fileName)

        with open("./public/mitosis/wsl/%s/"%fileName + "/output/%s.dzi"%fileName) as xml_file:       
            data_dict = xmltodict.parse(xml_file.read()) 
            print(data_dict)
            Format = data_dict['Image']['@Format']
            Overlap = data_dict['Image']['@Overlap']
            TileSize = data_dict['Image']['@TileSize']
            Width = data_dict['Image']['Size']['@Width']
            Height = data_dict['Image']['Size']['@Height']

        xml_file.close() 

        response = {
            'status': 'file is present',
            'data': {
                "Format": Format,
                "Overlap": Overlap,
                "TileSize":TileSize,
                "Width": Width,
                "Height":Height
            }
        }

        return response

    if fileName:
        try:
            foldername = fileName
            # wsl_file = os.path.join(os.getcwd(), "public/brain/wsl/%s/%s/"%foldername%fileName)
            wsl_file = os.path.join("./public/mitosis/wsl/%s/%s"%foldername%fileName)
            
            if wsl_file.is_file():
                stats = os.stat(wsl_file)          
                print(datetime.now() + ": file size is %s"%fileSize + "and already uploaded file size %s"%stats.st_size)

                if not mitosis_wsl_uploads.has_key(fileId):
                    mitosis_wsl_uploads[fileId] = {}
                
                mitosis_wsl_uploads[fileId]["bytesReceived"] = stats.st_size; 
                print(datetime.now()+"uploaded amount is %s"%stats.size)
            else:
                print('NOT A FILE')
        except:
            print("error")


    if fileId not in mitosis_wsl_uploads:
        mitosis_wsl_uploads[fileId] = {}

    upload = mitosis_wsl_uploads[fileId]
    if upload:
        response = { "uploaded": upload.bytesReceived }
    else:
        response = { "uploaded": 0}
    print(response)

    return response

@app.route('/mitosis/dzi/upload', methods = ['POST'])
def upload_brainwsl():
    fileName = request.headers["name"]
    # foldername = re.sub(r'[^\w]', '_',fileName)
    foldername = fileName

    uploadPath = os.path.join(os.getcwd(), "public/mitosis/wsl/%s/"%foldername)
    if not os.path.exists(uploadPath):
        os.makedirs(uploadPath)

    fileFullPath = os.path.join(uploadPath, fileName)
    
    with open(fileFullPath, "wb") as f:
        chunk_size = 4096
        while True:
            chunk = request.stream.read(chunk_size)
            if len(chunk) == 0:
                break
            f.write(chunk)

    savePath = os.path.join(uploadPath, "output")
    if not os.path.exists(savePath):
        os.makedirs(savePath)

    img = pyvips.Image.new_from_file(fileFullPath, access='sequential')
    img.dzsave(savePath+"/%s"%fileName, overlap=0, tile_size=800)


    with open(savePath + "/%s.dzi"%fileName) as xml_file:       
        data_dict = xmltodict.parse(xml_file.read()) 
        print(data_dict)
        Format = data_dict['Image']['@Format']
        Overlap = data_dict['Image']['@Overlap']
        TileSize = data_dict['Image']['@TileSize']
        Width = data_dict['Image']['Size']['@Width']
        Height = data_dict['Image']['Size']['@Height']

        xml_file.close() 

    response = {
        "Format": Format,
        "Overlap": Overlap,
        "TileSize":TileSize,
        "Width": Width,
        "Height":Height
    }  
 
    return response

@app.route('/mitosis/detectwsl/',methods = ['POST'])
def get_wsl_detections():
    fileName = request.get_json()["name"]

    # check if detection result exists
    if (os.path.exists('./public/mitosis/wsldetections/' + fileName + '.json')):
    
        with open('./public/mitosis/wsldetections/' + fileName + '.json') as json_file:       
            response = json_file.read()

        json_file.close() 

        return response

    path = "public/mitosis/wsl/%s/output/%s_files"%(fileName,fileName)
    tiles = os.listdir(path)
    tiles_list = list(map(int,tiles))
    print(tiles_list)
    print("max(tiles)",max(tiles_list))
    sub_path = path +'/'+ str(max(tiles_list))
    tileimages = os.listdir(sub_path)

    # color = {"oligo": (255,0,0), "AC": (0,0,255),"endo":(0,255,0),"neuron":(255,0,255),"undetermined":(0,0,0)}
    
    detection_results = []
    for tile in tileimages:
        res = {}
        res['name'] = tile
        tile_path = bytes(sub_path+'/'+tile, encoding='utf-8')
        print(tile_path)
        r = detect(net,meta, tile_path)
        res['detections'] = r
        detection_results.append(res)


    response = {
        "name": fileName,
        "all_detections": detection_results
    }

    json_data = json.dumps(response)           
    with open("public/mitosis/wsldetections/" + fileName + '.json', "w",encoding='utf-8') as json_file:
        json_file.write(json_data)
        json_file.close()

    return response



if __name__ == '__main__':
    app.run(debug=True, host='129.100.20.38', port = 80)
