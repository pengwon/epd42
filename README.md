# EPD42

[English](README_EN.md)

4.2 寸电子墨水屏固件，带有一个[网页版上位机](https://pengwon.github.io/epd42/)，可以通过蓝牙传输图像到墨水屏。

理论上支持所有 nRF51 系列 MCU，内置 3 个微雪 4.2 寸墨水屏驱动（可切换），同时还支持自定义墨水屏到 MCU 的引脚映射，支持睡眠唤醒（NFC / 无线充电器）。

## 支持设备

硬件是对电商平台上4.2寸墨水屏价签hack而来，可以[点此购买](https://item.taobao.com/item.htm?ft=t&id=874071462547)，支持黑白双色和黑白红三色两种版本。

- 黑白双色版本

  ```
  MCU：nRF51822
  RAM：16K
  ROM：128K

  驱动：UC8176 (EPD_4in2)
  屏幕引脚：0508090A0B0C0D
  线圈引脚：07
  ```

  ![](html/images/1.jpg)

- 黑白红三色版本

  ```
  MCU：nRF51802
  RAM：16K
  ROM：256K

  驱动：UC8276C (EPD_4in2b_V2)
  屏幕引脚：0A0B0C0D0E0F10
  线圈引脚：09
  LED引脚：03/04/05 （有三个 LED，任选一个使用）
  ```

  ![](html/images/2.jpg)

默认驱动和引脚映射为黑白双色版本，其它版本需要切换驱动并修改引脚映射。

## 上位机

地址：https://pengwon.github.io/epd42/ 

![](html/images/0.jpg)

扫描上方二维码加入微信群，获取更多信息。

## 开发

> **注意:**
> - 必须使用 [Keil 5.36](https://img.anfulai.cn/bbs/96992/MDK536.EXE) 或以下版本，nRF51 SDK 只支持 V5 版本的 ARM 编译器，从 5.37 版本开始 Keil 已经不再内置 V5 版本编译器，需要手动安装。

项目配置有几个 `Target`：

- `nRF51822_xxAB`: 用于编译 nRF51822 固件, 内置黑白双色版本配置
- `nRF51802_xxAA`: 用于编译 nRF51802 固件, 内置黑白红三色版本配置
- `flash_softdevice` 结尾的 `Target`: 刷蓝牙协议栈用（只需刷一次）

烧录器可以使用 J-Link 或者 DAPLink（可使用 [RTTView](https://github.com/XIVN1987/RTTView) 查看 RTT 日志）。

**刷机流程:**

> 如不修改代码，建议到 [Releases](https://github.com/tsl0922/EPD-nRF51/releases) 下载二进制固件，开箱即用。

1. 全部擦除 (Keil 擦除后刷不了的话，使用烧录器的上位机软件擦除试试)
2. 切换到 MCU 对应的 `flash_softdevice` `Target`，**不要编译直接下载**（只需刷一次）
3. 切换到 MCU 对应的 `Target`，先编译再下载

## 致谢

- 本项目基于 [EPD-nRF51](https://github.com/tsl0922/EPD-nRF51) 分叉而来，感谢原作者的分享和贡献。
