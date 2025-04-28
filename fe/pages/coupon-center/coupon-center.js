// pages/coupon-center/coupon-center.js
const app = getApp();
const { couponApi } = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    availableCoupons: [],
    loading: false,
    showShareModal: false,
    shareQrcode: '',
    currentCoupon: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 如果是从分享链接进来的，则处理分享的优惠券
    if (options.coupon_id && options.share_user_id) {
      this.handleSharedCoupon(options.coupon_id, options.share_user_id);
    }
    
    this.loadAvailableCoupons();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.setData({
      userInfo: app.globalData.userInfo
    });
    
    // 刷新优惠券数据
    this.loadAvailableCoupons();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadAvailableCoupons();
    wx.stopPullDownRefresh();
  },

  /**
   * 加载可领取优惠券列表
   */
  loadAvailableCoupons() {
    this.setData({ loading: true });
    
    couponApi.getCoupons().then(res => {
      if (res.success) {
        this.setData({
          availableCoupons: res.data.list || [],
          loading: false
        });
      } else {
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    }).catch(err => {
      console.error('[COUPON] 获取可用优惠券失败', err);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
      this.setData({ loading: false });
    });
  },

  /**
   * 领取优惠券
   */
  receiveCoupon(e) {
    // 检查用户是否登录
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.navigateTo({
        url: '/pages/login/login'
      });
      return;
    }
    
    const couponId = e.currentTarget.dataset.id;
    
    wx.showLoading({ title: '领取中...' });
    
    couponApi.receiveCoupon(couponId).then(res => {
      wx.hideLoading();
      if (res.success) {
        wx.showToast({
          title: '领取成功',
          icon: 'success'
        });
        
        // 刷新列表
        this.loadAvailableCoupons();
      } else {
        wx.showToast({
          title: res.message || '领取失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('[COUPON] 领取优惠券失败', err);
      wx.showToast({
        title: err,
        icon: 'none'
      });
    });
  },

  /**
   * 前往我的优惠券页面
   */
  goToUserCoupons() {
    wx.navigateTo({
      url: '/pages/coupon/coupon'
    });
  },

  /**
   * 前往扫码领券页面
   */
  goToScanCode() {
    wx.navigateTo({
      url: '/pages/scan-code/scan-code'
    });
  },

  // 分享优惠券
  shareCoupon(e) {
    const { coupon } = e.currentTarget.dataset;
    if (!coupon) return;
    
    this.setData({
      currentCoupon: coupon,
      showShareModal: true
    });
    
    // 生成分享二维码
    this.generateShareQrcode(coupon);
  },

  // 生成分享二维码
  generateShareQrcode(coupon) {
    wx.showLoading({
      title: '生成中...',
      mask: true
    });
    
    couponApi.shareCoupon(coupon.id).then(res => {
      if (res.success) {
        this.setData({
          shareQrcode: res.data.qrcode_url,
          shareId: res.data.share_id
        });
      } else {
        wx.showToast({
          title: res.message || '生成二维码失败',
          icon: 'none'
        });
      }
      wx.hideLoading();
    }).catch(err => {
      console.error('生成二维码失败:', err);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
      wx.hideLoading();
    });
  },

  // 隐藏分享弹窗
  hideShareModal() {
    this.setData({
      showShareModal: false,
      shareQrcode: '',
      currentCoupon: null
    });
  },

  // 保存二维码到相册
  saveQrcode() {
    const qrcodeUrl = this.data.shareQrcode;
    if (!qrcodeUrl) {
      wx.showToast({
        title: '二维码未加载完成',
        icon: 'none'
      });
      return;
    }
    
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.writePhotosAlbum']) {
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: () => {
              this.saveImageToAlbum(qrcodeUrl);
            },
            fail: () => {
              wx.showModal({
                title: '提示',
                content: '需要您授权保存图片到相册',
                showCancel: false,
                success: () => {
                  wx.openSetting();
                }
              });
            }
          });
        } else {
          this.saveImageToAlbum(qrcodeUrl);
        }
      }
    });
  },
  
  // 下载并保存图片
  saveImageToAlbum(imageUrl) {
    wx.showLoading({
      title: '保存中...',
      mask: true
    });
    
    wx.downloadFile({
      url: imageUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({
                title: '保存成功',
                icon: 'success'
              });
            },
            fail: (err) => {
              wx.hideLoading();
              wx.showToast({
                title: '保存失败',
                icon: 'none'
              });
              console.error('保存图片失败:', err);
            }
          });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '下载图片失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '下载图片失败',
          icon: 'none'
        });
        console.error('下载图片失败:', err);
      }
    });
  },

  // 页面分享
  onShareAppMessage() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const userId = userInfo.id;
    
    if (this.data.currentCoupon) {
      return {
        title: `送你一张${this.data.currentCoupon.amount}元优惠券`,
        path: `/pages/coupon-center/coupon-center?coupon_id=${this.data.currentCoupon.id}&share_user_id=${userId}`,
        imageUrl: this.data.shareQrcode || '/static/images/coupon_share.png'
      };
    }
    return {
      title: '快来领取优惠券',
      path: '/pages/coupon-center/coupon-center'
    };
  },

  /**
   * 处理分享的优惠券
   */
  handleSharedCoupon(couponId, shareUserId) {
    // 检查用户是否登录
    const token = wx.getStorageSync('token');
    if (!token) {
      // 保存分享信息到全局，登录后再处理
      getApp().globalData.pendingSharedCoupon = {
        coupon_id: couponId,
        share_user_id: shareUserId
      };
      
      wx.navigateTo({
        url: '/pages/login/login?redirect=/pages/coupon-center/coupon-center'
      });
      return;
    }
    
    wx.showModal({
      title: '领取优惠券',
      content: '是否领取分享的优惠券？',
      confirmText: '立即领取',
      success: (res) => {
        if (res.confirm) {
          this.receiveSharedCoupon(couponId, shareUserId);
        }
      }
    });
  },
  
  /**
   * 领取分享的优惠券
   */
  receiveSharedCoupon(couponId, shareUserId) {
    wx.showLoading({ title: '领取中...' });
    
    couponApi.receiveSharedCoupon(couponId, shareUserId).then(res => {
      wx.hideLoading();
      if (res.success) {
        wx.showToast({
          title: '领取成功',
          icon: 'success'
        });
        
        // 刷新列表
        wx.navigateTo({
          url: '/pages/coupon/coupon'
        });
      } else {
        wx.showToast({
          title: res.message || '领取失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('[COUPON] 领取分享优惠券失败', err);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  },

  // 长按二维码显示选项
  showShareOptions() {
    wx.showActionSheet({
      itemList: ['分享到微信', '保存到相册'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 用户选择分享到微信，使用微信自带的分享
          // 在小程序中，这个功能会由open-type="share"按钮处理，此处只是UI提示
          wx.showToast({
            title: '请点击"分享给好友"按钮',
            icon: 'none'
          });
        } else if (res.tapIndex === 1) {
          // 用户选择保存到相册
          this.saveQrcode();
        }
      }
    });
  },
}) 