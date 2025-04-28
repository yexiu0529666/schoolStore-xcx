// pages/merchant/coupons/coupons.js
const app = getApp();
const { merchantApi } = require('../../../utils/api');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    coupons: [],
    loading: true,
    page: 1,
    limit: 10,
    total: 0,
    hasMore: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadCoupons();
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
    // 从其他页面回来时刷新列表
    if (app.globalData.couponRefresh) {
      this.setData({ page: 1 });
      this.loadCoupons();
      app.globalData.couponRefresh = false;
    }
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
    this.setData({ page: 1 });
    this.loadCoupons();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (this.data.hasMore) {
      this.loadMoreCoupons();
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 加载优惠券列表
   */
  loadCoupons() {
    this.setData({ loading: true });
    
    merchantApi.getMerchantCoupons({
      page: this.data.page,
      limit: this.data.limit
    }).then(res => {
      if (res.success) {
        this.setData({
          coupons: res.data.list || [],
          total: res.data.total || 0,
          hasMore: (res.data.list || []).length < (res.data.total || 0),
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
      console.error('[MERCHANT_COUPONS] 加载优惠券列表失败', err);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
      this.setData({ loading: false });
    });
  },

  /**
   * 加载更多优惠券
   */
  loadMoreCoupons() {
    if (this.data.loading) return;
    
    this.setData({
      loading: true,
      page: this.data.page + 1
    });
    
    merchantApi.getMerchantCoupons({
      page: this.data.page,
      limit: this.data.limit
    }).then(res => {
      if (res.success) {
        const newCoupons = res.data.list || [];
        this.setData({
          coupons: [...this.data.coupons, ...newCoupons],
          hasMore: this.data.coupons.length + newCoupons.length < (res.data.total || 0),
          loading: false
        });
      } else {
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        });
        this.setData({
          page: this.data.page - 1,
          loading: false
        });
      }
    }).catch(err => {
      console.error('[MERCHANT_COUPONS] 加载更多优惠券失败', err);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
      this.setData({
        page: this.data.page - 1,
        loading: false
      });
    });
  },

  /**
   * 添加优惠券
   */
  addCoupon() {
    wx.navigateTo({
      url: '/pages/merchant/add-coupon/add-coupon'
    });
  },

  /**
   * 编辑优惠券
   */
  editCoupon(e) {
    const couponId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/merchant/add-coupon/add-coupon?id=${couponId}`
    });
  },

  /**
   * 删除优惠券
   */
  deleteCoupon(e) {
    const couponId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个优惠券吗？如已有用户领取，优惠券将变为失效状态而非删除。',
      success: (res) => {
        if (res.confirm) {
          this.doDeleteCoupon(couponId);
        }
      }
    });
  },

  /**
   * 执行删除优惠券
   */
  doDeleteCoupon(couponId) {
    wx.showLoading({
      title: '处理中',
      mask: true
    });
    
    merchantApi.removeCoupon(couponId).then(res => {
      wx.hideLoading();
      if (res.success) {
        wx.showToast({
          title: res.message || '删除成功',
          icon: 'success'
        });
        
        // 从列表中移除或标记为失效
        this.setData({
          coupons: this.data.coupons.filter(item => item.id !== couponId)
        });
      } else {
        wx.showToast({
          title: res.message || '删除失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('[MERCHANT_COUPONS] 删除优惠券失败', err);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  },

  /**
   * 切换优惠券状态
   */
  toggleStatus(e) {
    const couponId = e.currentTarget.dataset.id;
    const currentStatus = e.currentTarget.dataset.status;
    const newStatus = !currentStatus;
    
    wx.showLoading({
      title: '处理中',
      mask: true
    });
    
    merchantApi.updateCoupon({
      id: couponId,
      is_active: newStatus
    }).then(res => {
      wx.hideLoading();
      if (res.success) {
        wx.showToast({
          title: newStatus ? '已启用' : '已停用',
          icon: 'success'
        });
        
        // 更新列表中的状态
        const coupons = this.data.coupons.map(item => {
          if (item.id === couponId) {
            return {...item, is_active: newStatus};
          }
          return item;
        });
        
        this.setData({ coupons });
      } else {
        wx.showToast({
          title: res.message || '操作失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('[MERCHANT_COUPONS] 更新优惠券状态失败', err);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  },
})