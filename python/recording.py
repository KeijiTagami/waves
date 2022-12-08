#参考：https://watlab-blog.com/2019/05/19/python-spectrogram/
import numpy as np
from scipy import signal
from scipy import fftpack
from matplotlib import pyplot as plt
import pyaudio

def record(index, samplerate, fs, time):
    pa = pyaudio.PyAudio()
    data = []
    dt = 1 / samplerate

    # ストリームの開始
    stream = pa.open(format=pyaudio.paInt16, channels=1, rate=samplerate,
                     input=True, input_device_index=index, frames_per_buffer=fs)

    # フレームサイズ毎に音声を録音していくループ
    for i in range(int(((time / dt) / fs))):
        frame = stream.read(fs)
        data.append(frame)

    # ストリームの終了
    stream.stop_stream()
    stream.close()
    pa.terminate()

    # データをまとめる処理
    data = b"".join(data)

    # データをNumpy配列に変換
    data = np.frombuffer(data, dtype="int16") / float((np.power(2, 16) / 2) - 1)

    return data, i

# オーバーラップをかける関数
def ov(data, samplerate, Fs, overlap):
    Ts = len(data) / samplerate                     # 全データ長
    Fc = Fs / samplerate                            # フレーム周期
    x_ol = Fs * (1 - (overlap / 100))               # オーバーラップ時のフレームずらし幅
    N_ave = int((Ts - (Fc * (overlap / 100))) /
                (Fc * (1 - (overlap / 100))))       # 抽出するフレーム数（平均化に使うデータ個数）

    array = []                                      # 抽出したデータを入れる空配列の定義

    # forループでデータを抽出
    for i in range(N_ave):
        ps = int(x_ol * i)                          # 切り出し位置をループ毎に更新
        array.append(data[ps:ps + Fs:1])            # 切り出し位置psからフレームサイズ分抽出して配列に追加
        final_time = (ps + Fs)/samplerate           # 切り出したデータの最終時刻
    return array, N_ave, final_time                 # オーバーラップ抽出されたデータ配列とデータ個数、最終時間を戻り値にする

# ハニング窓をかける関数（振幅補正係数計算付き）
def hanning(data_array, Fs, N_ave):
    han = signal.hann(Fs)                           # ハニング窓作成
    acf = 1 / (sum(han) / Fs)                       # 振幅補正係数(Amplitude Correction Factor)

    # オーバーラップされた複数時間波形全てに窓関数をかける
    for i in range(N_ave):
        data_array[i] = data_array[i] * han         # 窓関数をかける

    return data_array, acf

# dB(デシベル）演算する関数
def db(x, dBref):
    y = 20 * np.log10(x / dBref)                   # 変換式
    return y                                       # dB値を返す

# 聴感補正(A補正)する関数
def aweightings(f):
    if f[0] == 0:
        f[0] = 1
    ra = (np.power(12194, 2) * np.power(f, 4))/\
         ((np.power(f, 2) + np.power(20.6, 2)) *
          np.sqrt((np.power(f, 2) + np.power(107.7, 2)) *
                  (np.power(f, 2) + np.power(737.9, 2))) *
          (np.power(f, 2) + np.power(12194, 2)))
    a = 20 * np.log10(ra) + 2.00
    return a

# 平均化FFTする関数
def fft_ave(data_array, samplerate, Fs, N_ave, acf, no_db_a):
    fft_array = []
    fft_axis = np.linspace(0, samplerate, Fs)      # 周波数軸を作成
    a_scale = aweightings(fft_axis)                # 聴感補正曲線を計算

    # FFTをして配列にdBで追加、窓関数補正値をかけ、(Fs/2)の正規化を実施。
    for i in range(N_ave):
        # dB表示しない場合とする場合で分ける
        if no_db_a == True:
            fft_array.append(acf * np.abs(fftpack.fft(data_array[i]) / (Fs / 2)))
        else:
            fft_array.append(db
                            (acf * np.abs(fftpack.fft(data_array[i]) / (Fs / 2))
                            , 2e-5))
    # 型をndarrayに変換しA特性をかける(A特性はdB表示しない場合はかけない）
    if no_db_a == True:
        fft_array = np.array(fft_array)
    else:
        fft_array = np.array(fft_array) + a_scale
    fft_mean = np.mean(np.sqrt(fft_array ** 2), axis=0)          # 全てのFFT波形の平均を計算

    return fft_array, fft_mean, fft_axis

# Fsとoverlapでスペクトログラムの分解能を調整する。
Fs = 4096                                   # フレームサイズ
overlap = 90                                # オーバーラップ率

# 録音して波形を作る（indexはPCによる）
index = 0
samplerate = 44100
t_max = 5
data, i = record(index, samplerate, Fs, t_max)
x = np.arange(0, Fs * (i+1) * (1 / samplerate), 1 / samplerate)

# オーバーラップ抽出された時間波形配列
time_array, N_ave, final_time = ov(data, samplerate, Fs, overlap)

# ハニング窓関数をかける
time_array, acf = hanning(time_array, Fs, N_ave)

# FFTをかける
fft_array, fft_mean, fft_axis = fft_ave(time_array, samplerate, Fs, N_ave, acf, no_db_a=True)

# スペクトログラムで縦軸周波数、横軸時間にするためにデータを転置
fft_array = fft_array.T

# ここからグラフ描画
# グラフをオブジェクト指向で作成する。
fig = plt.figure()
ax1 = fig.add_subplot(111)

# データをプロットする。
im = ax1.imshow(fft_array,
                vmin=0, vmax=np.max(fft_array),
                extent=[0, final_time, 0, samplerate],
                aspect='auto',
                cmap='jet')

# カラーバーを設定する。
cbar = fig.colorbar(im)
cbar.set_label('SP [Pa]')

# 軸設定する。
ax1.set_xlabel('Time [s]')
ax1.set_ylabel('Frequency [Hz]')

# スケールの設定をする。
ax1.set_xticks(np.arange(0, t_max*10, 1))
ax1.set_yticks(np.arange(0, 20000, t_max*100))
ax1.set_xlim(0, t_max)
ax1.set_ylim(0, 2000)

# グラフを表示する。
plt.show()
plt.close()