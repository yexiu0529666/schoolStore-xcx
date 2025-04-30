// pages/coupon/coupon.js
const app = getApp();
const { couponApi } = require('../../utils/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    tabs: ['未使用', '已使用', '已过期'],
    currentTab: 0,
    statusValues: ['unused', 'used', 'expired'],
    coupons: [],
    loading: false,
    couponList: [],
    showShareModal: false,
    shareQrcode: '',
    currentCoupon: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadUserCoupons();
    this.loadCouponList();
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
    // 页面显示时刷新数据
    this.loadUserCoupons();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadUserCoupons();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 切换标签
   */
  switchTab(e) {
    const tabIndex = e.currentTarget.dataset.index;
    if (tabIndex === this.data.currentTab) return;
    
    this.setData({
      currentTab: tabIndex
    });
    
    this.loadUserCoupons();
  },

  /**
   * 加载用户优惠券列表
   */
  loadUserCoupons() {
    const status = this.data.statusValues[this.data.currentTab];
    
    this.setData({ loading: true });
    
    couponApi.getUserCoupons(status).then(res => {
      if (res.success) {
        this.setData({
          coupons: res.data || [],
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
      console.error('[COUPON] 获取优惠券失败', err);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
      this.setData({ loading: false });
    });
  },

  /**
   * 打开领券中心
   */
  openAvailableCoupons() {
    wx.navigateTo({
      url: '/pages/coupon-center/coupon-center'
    });
  },

  /**
   * 前往使用优惠券
   */
  useCoupon() {
    wx.navigateTo({
      url: '/pages/product-list/product-list'
    });
  },


  // 分享优惠券
  onShareCoupon(e) {
    const { coupon } = e.currentTarget.dataset;
    this.setData({
      currentCoupon: coupon,
      showShareModal: true
    });
    this.generateShareQrcode(coupon);
  },

  // 生成分享二维码
  generateShareQrcode(coupon) {
    // TODO: 调用后端接口生成分享二维码
    const mockQrcode = 'https://example.com/qrcode.png';
    this.setData({
      shareQrcode: mockQrcode
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

  // 领取优惠券
  onReceiveCoupon(e) {
    const { coupon } = e.currentTarget.dataset;
    if (!coupon) return;
    
    wx.showLoading({
      title: '领取中...',
      mask: true
    });
    
    wx.request({
      url: 'http://localhost:5000/api/coupon/receive',
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`,
        'Content-Type': 'application/json'
      },
      data: {
        id: coupon.id
      },
      success: (res) => {
        if (res.data.success) {
          wx.showToast({
            title: '领取成功',
            icon: 'success',
            duration: 2000
          });
          // 刷新优惠券列表
          this.loadUserCoupons();
        } else {
          wx.showToast({
            title: res.data.message || '领取失败',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: (err) => {
        console.error('领取优惠券失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none',
          duration: 2000
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: '快来领取优惠券',
      path: '/pages/coupon/coupon'
    };
  }
})