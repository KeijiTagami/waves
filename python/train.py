#画像データ前処理, 描画用
import numpy as np
import matplotlib.pyplot as plt
#機械学習
import tensorflow as tf
import tensorflowjs as tfjs

from tensorflow.keras import datasets, layers, models
from tensorflow.keras.utils import plot_model
#通知の通信用
import requests
import random
from PIL import Image
import cv2
from tqdm import tqdm
import os


#0,1のgpuのうち片方を使う
def allocate_gpu_memory(gpu_number=0):
    physical_devices = tf.config.experimental.list_physical_devices('GPU')

    if physical_devices:
        try:
            print("Found {} GPU(s)".format(len(physical_devices)))
            tf.config.set_visible_devices(physical_devices[gpu_number], 'GPU')
            tf.config.experimental.set_memory_growth(physical_devices[gpu_number], True)
            print("#{} GPU memory is allocated".format(gpu_number))
        except RuntimeError as e:
            print(e)
    else:
        print("Not enough GPU hardware devices available")


def surface_load(path,OUTPUT_SIZE=1024,resize=None):
    surface = np.fromfile(path, dtype=np.float32)
    surface=surface.reshape(OUTPUT_SIZE,OUTPUT_SIZE,4)
    surface=surface[::-1]
    if resize is None:
        return surface
    outw,outh=resize
    surface=cv2.resize(surface,dsize=(outw,outh))
    fig=plt.figure()
    plt.imshow(surface)
    fig.savefig("./temp.png")
    print("surface_load:",surface.shape)
    return surface


def image_load(path,size,cutting_rate=0.05,resize=None):
    img=tf.io.read_file(path)
    img=tf.image.decode_png(img, channels=4).numpy()
    margin=int(cutting_rate*size/2)
    img_clip=img[margin:size-margin,margin:size-margin,:]#画像の端を切る
    img_clip=img_clip/255
    if resize is None:
        img_resize=cv2.resize(img_clip,dsize=[1024]*2)
        return img_resize
    outw,outh=resize
    print("resize",resize)
    img_resize=cv2.resize(img_clip,dsize=resize)
    print("img_load:",img_resize.shape)
    return img_resize


def genTrueImages(images,margin):
    #target_size=1024-margin*2#出力のサイズ(margin*2の分だけ縮小する)
    true_images=[]
    for img in images:
        img_clip=img[margin:-margin,margin:-margin]#画像をmarginの分だけクリッピング
        img_tf = tf.convert_to_tensor(img_clip[ None,:, :, 3], tf.float32)#imageの透明度部分
        true_images.append(img_tf)
    return true_images
    #print("before:",images[0].shape,"after:",true_images[0].shape)


class ProgressBar(tf.keras.callbacks.Callback):
    
    def on_train_begin(self, logs):
        self.progress = tqdm(total=self.params["epochs"], unit="epochs")
    
    def on_epoch_end(self, epoch, logs):
        self.progress.postfix = f"loss: {logs['loss']:.5f}"
        self.progress.update(1)

    def on_train_end(self, logs):
        self.progress.close()


def gauss2D(sigma=1.0):
    size = int(np.ceil(2 * sigma))
    gsize = 1 + 2 * size
    mesh = np.linspace(-2.0, 2.0, gsize)
    x, y = np.meshgrid(mesh, mesh)
    h = np.exp( -(x*x + y*y) / 2)
    return size, h / h.sum()


#2つのパスで畳み込みを繰り返すモデル(B:プーリングあり, A:プーリングなし)
def gen_model(layers, scale, lr, gauss=1.0,outputSize=None):
    #marginを事前に計算
    shrinksize=0
    for i, (num, size) in enumerate(layers):
        shrinksize += size
    gsize, gkernel = gauss2D(gauss)
    print("gkernel",gkernel.shape)
    diff = (shrinksize * scale + gsize) - shrinksize
    if outputSize is None:
        x=tf.keras.Input(shape=(None,None,3))
    else:
        margin=shrinksize*scale+gsize
        outw,outh=outputSize
        x = tf.keras.Input(shape=(outh+margin*2,outw+margin*2,3))#入力(行(高さ),列(行)であることに注意！)
        print("InputSize:",(outw+margin*2,outh+margin*2))

    #分岐B(プーリングを通りてぼかした処理)
    B = tf.keras.layers.AveragePooling2D(
        pool_size=(scale, scale)
    )(x) #B1：入力画像のプーリング
    for i, (num, size) in enumerate(layers):
        B = tf.keras.layers.Conv2D(
            num, 2 * size + 1, activation='relu', name=f'cv2_B_{i+1}',
        )(B) #Bi:畳み込み
        #shrinksize += size
    B = tf.keras.layers.UpSampling2D(
        size=(scale, scale)
    )(B) #Blast：畳み込み後の拡大

    #gsize, gkernel = gauss2D(gauss)
    glayer = tf.keras.layers.DepthwiseConv2D(2 * gsize + 1, use_bias=False, name="gauss")
    B = glayer(B)
    glayer.set_weights([np.tile(gkernel[..., None, None], [1, 1, num, 1])])
    glayer.trainable= False
    
    #diff = (shrinksize * scale + gsize) - shrinksize
    #分岐A(画像をそのまま処理)
    A = x
    kernel = np.zeros((1 + 2 * diff, 1 + 2 * diff))
    kernel[size, size] = 1
    """
    crop = tf.keras.layers.DepthwiseConv2D(2 * diff + 1, use_bias=False, name=f'cv2_Acrop')
    A = crop(A)
    crop.set_weights([tf.tile(kernel[..., None, None], [1, 1, 3, 1])])
    crop.trainable= False
    """ 
    crop = tf.keras.layers.Cropping2D(
        cropping=((diff, diff), (diff,diff))
    )
    A=crop(A)
    for i, (num, size) in enumerate(layers):
        A = tf.keras.layers.Conv2D(
            num, 2 * size + 1, activation='relu', name=f'cv2_A_{i+1}',
        )(A) #Ai:畳み込み
    
    concat = tf.keras.layers.Concatenate()([A, B])#B,Aの分岐を繋ぐ
    output = tf.keras.layers.Conv2D(
        1, 1, activation='hard_sigmoid',name=f'cv2_comp',
    )(concat)#1チャネルにまとめる処理
    
    model = tf.keras.Model(inputs=x, outputs=output)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=lr),
        #loss=tf.keras.losses.MeanAbsoluteError(),
        loss=tf.keras.losses.MeanSquaredError(),
        #metrics=['accuracy'],
    )
    #model.summary()
    return model, shrinksize * scale + gsize #分岐Bのサイズだけ減る


def get_model(layer, s, lr=0.001, gauss=1.0, min_delta=1e-6, patience=10, epochs=10000,outputSize=None):

    model, margin = gen_model(layers=layer, scale=s, lr=lr, gauss=gauss,outputSize=outputSize)   
    if outputSize is None:
        inputSize=None
        model_name=f"n{len(layer)}_l{layer[0][1]}_s{s}_lr{lr}_m{margin}_(None)"#モデルの識別名(層の数_フィルタの最大のサイズ_スケール_学習率_マージン_outputの大きさ1)
    else:
        outw,outh=outputSize
        inputSize=(outw+margin*2,outh+margin*2)
        print("inputSize:",inputSize)
        model_name=f"n{len(layer)}_l{layer[0][1]}_s{s}_lr{lr}_m{margin}_({outputSize[0]}_{outputSize[1]})"#モデルの識別名(層の数_フィルタの最大のサイズ_スケール_学習率_マージン_outputの大きさ1)
    
    print('model_name',model_name)
    new_dir_path=f"savedWeights/{model_name}"#重みを保存するディレクトリを作成
    os.mkdir(new_dir_path)#既に存在していたらエラーになる
    
    surfaces=[]
    images=[]
    for s_path  in surfaces_path:
        surfaces.append(surface_load(s_path,resize=inputSize))
    for i_path,size in zip(image_path,image_sizes):
        images.append(image_load(i_path,size,cutting_rate,resize=inputSize))
    
    true_images=genTrueImages(images,margin)
    dataX = tf.data.Dataset.from_tensor_slices([
        surfaces[0][None, :, :, :3],
        surfaces[1][None, :, :, :3],
        surfaces[2][None, :, :, :3],
    ])#入力側のデータ
    dataY = tf.data.Dataset.from_tensor_slices([
        true_images[0],
        true_images[1],
        true_images[2],
    ])#出力側のデータ
    datasets= tf.data.Dataset.zip((dataX,dataY))
    tensorboard_callback = tf.keras.callbacks.TensorBoard(log_dir=f"logs/{model_name}")
    es_callback = tf.keras.callbacks.EarlyStopping(monitor='loss', min_delta=min_delta, patience=patience)
    result = model.fit(datasets, epochs=epochs,
               #validation_data=[surfaces[2][None, :, :, :3], true_images[2]],
               callbacks=[ProgressBar(), es_callback, tensorboard_callback],verbose=0)
    model.save_weights(f'{new_dir_path}/{model_name}_last.h5')#最後の重み
    tfjs.converters.save_keras_model(model,f"../tfjsModel/{model_name}")#tensorflow.jsのモデルとして保存
    return result, true_images


allocate_gpu_memory(0)


surfaces_path=["surfacedata/oceandata_t1.dat","surfacedata/oceandata_t2.dat","surfacedata/oceandata_t3.dat"]
image_path=["imgdata/white_wave_rev.png","imgdata/white_wave2_rev.png","imgdata/white_wave3.png" ]
image_sizes=[2326,1023,1023]
cutting_rate=0.1

result, true_images = get_model([(10, 3), (10, 1)],4, lr=0.0001, gauss=4, min_delta=1e-5, patience=1000,outputSize=(208,260))
#20,3 20,1
#20,2 20,1
#10,4 10,2 10,1