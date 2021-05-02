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
from darknet import *
import simplejson as json
import xmltodict
from datetime import timedelta
import pyvips
from PIL import Image
import math
import numpy as np
from ki67_detection import ki67_detection

# For creating heatmaps
# import matplotlib.pyplot as plt
# import matplotlib.cm as cm

# net = load_net(b"brainmodels/basemodel/yolov3.cfg", b"brainmodels/basemodel/yolov3.weights", 0)
# meta = load_meta(b"brainmodels/basemodel/coco.data")

# net = load_net(b"brainmodels/yolov3/yolo-obj.cfg", b"brainmodels/yolov3/yolo-obj.backup", 0)
# meta = load_meta(b"brainmodels/yolov3/obj.data")


# os.environ["CUDA_DEVICE_ORDER"]="PCI_BUS_ID"
# os.environ["CUDA_VISIBLE_DEVICES"] = "0,1"

# set_gpu(0)

# net = load_net(b"brainmodels/yolov4/yolo-obj.cfg", b"brainmodels/yolov4/yolo-obj_best.weights", 0)
# meta = load_meta(b"brainmodels/yolov4/obj.data")

# set_gpu(1)

# mnet = load_net(b"mitosismodels/yolov4/yolo-obj.cfg", b"mitosismodels/yolov4/yolo-obj_best.weights", 0)
# mmeta = load_meta(b"mitosismodels/yolov4/obj.data")

# UPDATED on Feb 11, 2021 by Eric Liu
mnet = load_net(b"mitosismodels/yolov4/yolov4-mask.cfg", b"mitosismodels/yolov4/yolov4-mask_best.weights", 0)
mmeta = load_meta(b"mitosismodels/yolov4/obj.data")

app = flask.Flask(__name__, static_folder='./public')
# api = Api(app)
CORS(app)

@app.route('/')
def Hello():
    return "Hello World! Have a good day!"

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

@app.route('/mitosis/labeled')
def get_labeled_mitosisimg():
    files = os.listdir('public/mitosis/labeled/objects')   
    return jsonify({"files":files})


@app.route('/mitosis/segmented')
def get_mitosis_segmented_list():
    files = os.listdir('public/mitosis/segmented')
    return jsonify({"files":files})

@app.route('/mitosis/models')
def get_mitotic_detection_model():
    files = os.listdir('mitosismodels')
    return jsonify({"files":files})

@app.route('/mitosis/wholeslide')
def get_mitotic_wsl_list():
    files = os.listdir('public/mitosis/wsl')
    return jsonify({"files":files})

@app.route('/ki67')
def get_ki67_list():
    files = os.listdir('public/ki67/original')
    return jsonify({"files":files})

@app.route('/colonployp/wholeslide')
def get_colonployp_wsi_list():
    files = os.listdir('public/colonployp/wsi')
    return jsonify({"files":files})


@app.route('/brain/detections',methods = ['POST'])
def get_detections():
    print("Detect image")
    print("net is",net)
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


@app.route('/mitosis/detections',methods = ['POST'])
def get_mitosis_detections():
    print("Detect mitosis image")
    image = request.files['file']
    image.save(os.path.join(os.getcwd(), "public/mitosis/segmented/"+ image.filename))
    # image_path = bytes("public/brain/segmented/"+image.filename, encoding='utf-8')
    # im = Image.open(image_path)
    img = Image.open("public/mitosis/segmented/"+image.filename)
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
            tile.save("public/mitosis/cropped/%s_%d_%d.jpg"%(image.filename,i,j))
            path = bytes("public/mitosis/cropped/%s_%d_%d.jpg"%(image.filename,i,j), encoding='utf-8')
            
            r = detect(mnet,mmeta, path)
            res['detections'] = r
            detection_results.append(res)
            os.remove(path)

    response = {
        "code":200,
        "message": "mitosis prediction result retrived",
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

@app.route('/colonployp/wholeslide/retrievedata',methods = ['POST'])
def colonployp_retrieve_data():
    fileName = request.get_json()["name"]
    print(fileName)
    
    with open("public/colonployp/wsi/%s/output/%s.dzi"%(fileName,fileName)) as xml_file:       
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
def mitotic_retrieve_data():
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

@app.route('/mitosis/labeled/save', methods = ['POST'])
def save_labeled_mitosisimg():
    try:
        req = request.get_json()["data"]
        for i in range(len(req)):
            fileName = req[i]['name']
            result = re.search("data:image/(?P<ext>.*?);base64,(?P<data>.*)", req[i]['src'], re.DOTALL)
            data = result.groupdict().get("data")          
            imgdata = base64.b64decode(data)
            with open("public/mitosis/labeled/original/"+ fileName, 'wb') as f:
                f.write(imgdata)
            tmp = {
                "created": request.get_json()["created"],
                "name": fileName,
                "data": req[i]['data']
            }   
            json_data = json.dumps(tmp)           
            with open("public/mitosis/labeled/objects/"+ fileName + '.json', "w") as json_file:
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

@app.route('/mitosis/wsi/labeled/save', methods = ['POST'])
def save_labeled_wsi_mitosisimg():
    try:
        req = request.get_json()["data"]

        tmp = {
            "created": request.get_json()["created"],
            "name": request.get_json()["name"],
            "data": request.get_json()["data"]
        }   
        json_data = json.dumps(tmp)           
        with open("public/mitosis/labeled/objects/"+ request.get_json()["name"] + '.json', "w") as json_file:
        # with open("public/mitosis/wsldetections/"+ request.get_json()["name"] + '.json', "w") as json_file:
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

@app.route('/colonployp/wsi/labeled/save', methods = ['POST'])
def save_labeled_wsi_colonploypimg():
    try:
        req = request.get_json()["data"]

        tmp = {
            "created": request.get_json()["created"],
            "name": request.get_json()["name"],
            "data": request.get_json()["data"]
        }   
        json_data = json.dumps(tmp)           
        with open("public/colonployp/labeled/objects/"+ request.get_json()["name"] + '.json', "w") as json_file:
        # with open("public/mitosis/wsldetections/"+ request.get_json()["name"] + '.json', "w") as json_file:
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

@app.route('/mitosis/wsi/relearning/save',methods = ['POST'])
def save_mitosis_wsi_relearning_info():
    try:
        req = request.get_json()["data"]
        created = request.get_json()["created"]
    
        json_data = json.dumps(req)  
        with open("public/mitosis/relearning/"+ str(created) + '.json', "w") as json_file:
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

@app.route('/colonployp/wsi/relearning/save',methods = ['POST'])
def save_colonployp_wsi_relearning_info():
    try:
        req = request.get_json()["data"]
        created = request.get_json()["created"]
    
        json_data = json.dumps(req)  
        with open("public/colonployp/relearning/"+ str(created) + '.json', "w") as json_file:
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
    # fileId = request.get_json()["x-file-id"]
    # fileName = request.get_json()["name"]
    # fileSize = request.get_json()["size"]

    print(fileName)

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
            wsl_file = os.path.join("./public/brain/wsl/" + foldername + "/" + fileName)
            
            if os.path.isfile(wsl_file):
                stats = os.stat(wsl_file)          
                print("File size is " + str(fileSize) + " and already uploaded file size " + str(stats.st_size))

                if fileId not in wsl_uploads:
                    wsl_uploads[fileId] = {}
                
                wsl_uploads[fileId]["bytesReceived"] = stats.st_size; 
                print("uploaded amount is " + str(stats.size))
            else:
                print('NOT A FILE')
        except:
            print("error")


    if fileId not in wsl_uploads:
        wsl_uploads[fileId] = {}

    upload = wsl_uploads[fileId]
    if upload:
        response = { "uploaded": upload['bytesReceived'] }
    else:
        response = { "uploaded": 0}
    print(response)

    return response


@app.route('/brain/dzi/upload', methods = ['POST'])
def upload_brainwsl():
    print("Uploading braincell wsi...")

    fileName = request.headers["name"]
    # foldername = re.sub(r'[^\w]', '_',fileName)
    foldername = fileName

    uploadPath = os.path.join(os.getcwd(), "public/brain/wsl/%s/"%foldername)
    if not os.path.exists(uploadPath):
        os.makedirs(uploadPath)

    fileFullPath = os.path.join(uploadPath, fileName)
    
    # image.save(fileFullPath)

    # savePath = os.path.join(uploadPath, "output")
    # if not os.path.exists(savePath):
    #     os.makedirs(savePath)

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
        'data': {
            "Format": Format,
            "Overlap": Overlap,
            "TileSize":TileSize,
            "Width": Width,
            "Height":Height
        }
    }
 
    return response



mitosis_wsl_uploads = {}
@app.route('/mitosis/dzi/status',methods = ['GET'])
def get_mitosis_dzi_status():
    # storagePath = os.path.join(os.getcwd(), "public/brain/wsl/")
    storagePath = os.path.join("./public/mitosis/wsl/")
    fileId = request.headers.get("x-file-id")
    fileName = request.headers.get("name")
    fileSize = int(request.headers["size"])

    # prefix = fileName.split('.')[0]
    # suffix =  fileName.split('.')[1]
    # fileName = re.sub(r'\W+', '',prefix)

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
        print(response)

        return response

    print(fileName)

    if fileName:
        try:
            foldername = fileName
            # wsl_file = os.path.join(os.getcwd(), "public/brain/wsl/%s/%s/"%foldername%fileName)
            wsl_file = os.path.join("./public/mitosis/wsl/" + foldername + "/" + fileName)
            print(wsl_file)
            
            if os.path.isfile(wsl_file):
                stats = os.stat(wsl_file)          
                print("File size is " + fileSize + " and already uploaded file size " + str(stats.st_size))

                if fileId not in mitosis_wsl_uploads:
                    mitosis_wsl_uploads[fileId] = {}
                
                mitosis_wsl_uploads[fileId]["bytesReceived"] = stats.st_size; 
                print("uploaded amount is " + str(stats.size))
            else:
                print('NOT A FILE')
        except:
            print("error")


    if fileId not in mitosis_wsl_uploads:
        mitosis_wsl_uploads[fileId] = {}

    upload = mitosis_wsl_uploads[fileId]
    if upload:
        response = { "uploaded": upload['bytesReceived'] }
    else:
        response = { "uploaded": 0}
    print(response)

    return response



@app.route('/mitosis/dzi/upload', methods = ['POST'])
def upload_mitoticwsl():

    print("Uploading WSI file...")

    fileName = request.headers["name"]
    # prefix = fileName.split('.')[0]
    # suffix =  fileName.split('.')[1]

    # fileName = re.sub(r'\W+', '',prefix)+"."+suffix

    
    # 
    # print("foldername is", foldername)

    uploadPath = os.path.join(os.getcwd(), "public/mitosis/wsl/%s/"%fileName)
    # uploadPath = "./public/mitosis/wsl/" + fileName + "/"
    if not os.path.exists(uploadPath):
        os.makedirs(uploadPath)

    fileFullPath = os.path.join(uploadPath, fileName)
    print(fileFullPath)

    # image.save(fileFullPath)
    
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
        'data': {
            "Format": Format,
            "Overlap": Overlap,
            "TileSize":TileSize,
            "Width": Width,
            "Height":Height
        }
    }  
 
    return response

colonploypwsi_uploads = {}
@app.route('/colonployp/dzi/status',methods = ['GET'])
def get_colonployp_dzi_status():
    storagePath = os.path.join("./public/colonployp/wsi/")
    fileId = request.headers.get("x-file-id")
    fileName = request.headers.get("name")   
    fileSize = int(request.headers["size"])

    print(fileName)

    if (os.path.exists('./public/colonployp/wsi/' + fileName + '/output/' + fileName + '.dzi')):
        print("%s exists on server, start retrieving file"%fileName)

        with open("./public/colonployp/wsi/%s/"%fileName + "/output/%s.dzi"%fileName) as xml_file:       
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
            wsl_file = os.path.join("./public/colonployp/wsi/" + foldername + "/" + fileName)
            
            if os.path.isfile(wsl_file):
                stats = os.stat(wsl_file)          
                print("File size is " + str(fileSize) + " and already uploaded file size " + str(stats.st_size))

                if fileId not in wsl_uploads:
                    wsl_uploads[fileId] = {}
                
                wsl_uploads[fileId]["bytesReceived"] = stats.st_size; 
                print("uploaded amount is " + str(stats.size))
            else:
                print('NOT A FILE')
        except:
            print("error")


    if fileId not in wsl_uploads:
        wsl_uploads[fileId] = {}

    upload = wsl_uploads[fileId]
    if upload:
        response = { "uploaded": upload['bytesReceived'] }
    else:
        response = { "uploaded": 0}
    print(response)

    return response


@app.route('/colonployp/dzi/upload', methods = ['POST'])
def upload_colonploypwsl():
    print("Uploading colon ployp wsi...")

    fileName = request.headers["name"]
    # foldername = re.sub(r'[^\w]', '_',fileName)
    foldername = fileName

    uploadPath = os.path.join(os.getcwd(), "public/colonployp/wsi/%s/"%foldername)
    if not os.path.exists(uploadPath):
        os.makedirs(uploadPath)

    fileFullPath = os.path.join(uploadPath, fileName)
    
    # image.save(fileFullPath)

    # savePath = os.path.join(uploadPath, "output")
    # if not os.path.exists(savePath):
    #     os.makedirs(savePath)

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
        'data': {
            "Format": Format,
            "Overlap": Overlap,
            "TileSize":TileSize,
            "Width": Width,
            "Height":Height
        }
    }
 
    return response

@app.route('/mitosis/loadWSIAnnotation/',methods = ['POST'])
def get_mitosis_wsl_annotations():
    fileName = request.get_json()["name"]
    if (os.path.exists('./public/mitosis/labeled/objects/' + fileName + '.json')):
        with open('./public/mitosis/labeled/objects/' + fileName + '.json') as json_file:       
            response = json_file.read()
        json_file.close()
    else:
        response = {
            "data": []
        }

    return response

@app.route('/colonployp/loadWSIAnnotation/',methods = ['POST'])
def get_colonployp_wsl_annotations():
    fileName = request.get_json()["name"]
    if (os.path.exists('./public/colonployp/labeled/objects/' + fileName + '.json')):
        with open('./public/colonployp/labeled/objects/' + fileName + '.json') as json_file:       
            response = json_file.read()
        json_file.close()
    else:
        response = {
            "data": []
        }

    return response

        
        

@app.route('/mitosis/detectwsl/',methods = ['POST'])
def get_mitotic_wsl_detections():

    fileName = request.get_json()["name"]

    # check if detection result exists
    if (os.path.exists('./public/mitosis/wsldetections/' + fileName + '.json')):
    
        with open('./public/mitosis/wsldetections/' + fileName + '.json') as json_file:       
            response = json_file.read()

        json_file.close() 

        return response

    path = "public/mitosis/wsl/%s/output/%s_files"%(fileName,fileName)
    tiles = os.listdir(path)
    print(tiles)
    tiles_list = list(map(int,tiles))
    print(tiles_list)
    print("max(tiles)",max(tiles_list))
    sub_path = path +'/'+ str(max(tiles_list))
    tileimages = os.listdir(sub_path)
    
    detection_results = []
    for tile in tileimages:
        res = {}
        res['name'] = tile
        tile_path = bytes(sub_path+'/'+tile, encoding='utf-8')
        print(tile_path)
        r = detect(mnet,mmeta, tile_path)
        res['detections'] = r
        detection_results.append(res)


    response = {
        "name": fileName,
        "all_detections": detection_results
    }

    print(response)

    json_data = json.dumps(response)           
    with open("public/mitosis/wsldetections/" + fileName + '.json', "w",encoding='utf-8') as json_file:
        json_file.write(json_data)
        json_file.close()

    return response

@app.route('/ki67/detections',methods = ['POST'])  

def detection_ki67():
    image = request.files['file']
    image_path = os.path.join(os.getcwd(), "public/ki67/original/"+ image.filename)
    image.save(image_path)
    print(image_path)
    cells = ki67_detection(image_path)

    # print(cells)

    response = {
        "name":image.filename,
        "cells": cells
    }

    return response


# def detection_ki67():
#     image = request.files['file']
#     print(image)
#     image_path = os.path.join(os.getcwd(), "public/ki67/original/"+ image.filename)
#     image.save(image_path)
#     img = cv2.imread(image_path)
#     redLower = np.array([100, 50, 50])
#     redUpper = np.array([150, 255, 255])
#     blueLower = np.array([0,30,50])
#     blueUpper = np.array([80,255,255])   
#     hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV,0)
#     mask1 = cv2.inRange(hsv, redLower, redUpper)
#     mask2 = cv2.inRange(hsv, blueLower, blueUpper)
#     ret1, binary1 = cv2.threshold(mask1, 0, 255, cv2.THRESH_BINARY)
#     ret2, binary2 = cv2.threshold(mask2, 0, 255, cv2.THRESH_BINARY)
#     kernel = np.ones((5, 5), np.uint8)
#     dilation1 = cv2.dilate(binary1, kernel, iterations=1)
#     dilation2 = cv2.dilate(binary2, kernel, iterations=1)
#     contours1, hierarchy1 = cv2.findContours(dilation1, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
#     contours2, hierarchy2 = cv2.findContours(dilation2, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
#     cv2.drawContours(img,contours1,-1,(0,0,255),3)  
#     cv2.drawContours(img,contours2,-1,(255,0,0),3)    
#     cv2.imwrite("public/ki67/detected/"+image.filename,img)

#     response = {
#             "code": 200,
#             "message": image.filename+ "detection finished.",
#             "path": "/public/ki67/detected/"+image.filename
#         } 
#     return response



# ################################
# Heatmap
# ################################
def data_coord2view_coord(p, vlen, pmin, pmax):
    dp = pmax - pmin
    dv = (p - pmin) / dp * vlen
    return dv


def nearest_neighbours(xs, ys, reso, n_neighbours):
    im = np.zeros([reso, reso])
    extent = [np.min(xs), np.max(xs), np.min(ys), np.max(ys)]

    xv = data_coord2view_coord(xs, reso, extent[0], extent[1])
    yv = data_coord2view_coord(ys, reso, extent[2], extent[3])
    for x in range(reso):
        for y in range(reso):
            xp = (xv - x)
            yp = (yv - y)

            d = np.sqrt(xp**2 + yp**2)

            im[y][x] = 1 / np.sum(d[np.argpartition(d.ravel(), n_neighbours)[:n_neighbours]])

    return im, extent


# @app.route('/heatmap',methods = ['POST'])  
# def create_heatmap():
#     n = 1000
#     xs = np.random.randn(n)
#     ys = np.random.randn(n)
#     resolution = 250

#     print(xs)
#     print(ys)

#     fig, ax = plt.subplots()

#     im, extent = nearest_neighbours(xs, ys, resolution, 64)
#     ax.imshow(im, origin='lower', extent=extent, cmap=cm.jet)

#     F = plt.gcf()
#     DPI = F.get_dpi()
#     F.set_size_inches(312.0/float(DPI),800.0/float(DPI))

#     ax.set_aspect('equal')

#     plt.axis('off')
#     plt.subplots_adjust(left=0, bottom=0, right=1, top=1, wspace=0, hspace=0)
#     plt.savefig('foo.jpeg', transparent="True", pad_inches=0, dpi="figure")



if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port = 8080)
