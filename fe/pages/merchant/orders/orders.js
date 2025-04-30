// pages/merchant/orders/orders.js
const app = getApp();
const { merchantApi } = require('../../../utils/api');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    loading: true,
    orders: [],
    currentTab: 0,
    statusTabs: [
      { name: '全部', value: '' },
      { name: '待付款', value: 'pending_payment' },
      { name: '待发货', value: 'pending_shipment' },
      { name: '待收货', value: 'pending_receipt' },
      { name: '已完成', value: 'completed' },
      { name: '售后', value: 'refund' }
    ],
    currentStatus: '',
    page: 1,
    limit: 10,
    totalOrders: 0,
    hasMore: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查是否有商家权限
    this.checkMerchantAuth();
    
    // 如果有特定状态参数，设置对应的tab
    if (options.status) {
      const tabIndex = this.data.statusTabs.findIndex(tab => tab.value === options.status);
      if (tabIndex !== -1) {
        this.setData({
          currentTab: tabIndex,
          currentStatus: options.status
        });
      }
    }
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
    this.loadOrders(true);
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
   * 检查商家权限
   */
  checkMerchantAuth() {
    if (!app.globalData.isAdmin && !app.globalData.isMerchant) {
      wx.showModal({
        title: '提示',
        content: '您没有商家权限，请先登录商家账号',
        showCancel: false,
        success: () => {
          wx.navigateTo({
            url: '/pages/login/login'
          });
        }
      });
    }
  },

  /**
   * 加载订单列表
   * @param {boolean} refresh 是否刷新列表
   */
  loadOrders(refresh = false) {
    this.setData({ loading: true });
    
    const { currentStatus, page, limit } = this.data;
    
    // 如果是刷新，重置页码
    if (refresh) {
      this.setData({ page: 1 });
    }
    
    // 处理"售后"分类特殊情况
    let requestStatus = currentStatus;
    if (currentStatus === 'refund') {
      requestStatus = ['refunding', 'refunded'];
    }
    
    // 获取当前设置的页码（如果是刷新，使用1）
    const currentPage = refresh ? 1 : page;
    
    merchantApi.getMerchantOrders(requestStatus, currentPage, limit)
      .then(res => {
        if (res.success) {
          const newOrders = refresh ? res.data.list : [...this.data.orders, ...res.data.list];
          const totalOrders = res.data.total;
          
          this.setData({
            orders: newOrders,
            totalOrders: totalOrders,
            // 判断是否还有更多数据可加载
            hasMore: newOrders.length < totalOrders,
            loading: false
          });
        } else {
          wx.showToast({
            title: res.message || '获取订单列表失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      })
      .catch(err => {
        console.error('获取订单列表失败', err);
        wx.showToast({
          title: '获取订单列表失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      });
  },

  /**
   * 切换订单状态Tab
   */
  switchTab(e) {
    const tabIndex = e.currentTarget.dataset.index;
    const status = this.data.statusTabs[tabIndex].value;
    
    if (tabIndex !== this.data.currentTab) {
      this.setData({
        currentTab: tabIndex,
        currentStatus: status,
        page: 1,
        orders: []
      });
      
      this.loadOrders(true);
    }
  },

  /**
   * 处理订单
   */
  processOrder(e) {
    const { id, action } = e.currentTarget.dataset;
    let newStatus = '';
    let confirmText = '';
    
    // 根据操作确定新状态和确认文本
    switch (action) {
      case 'ship':
        newStatus = 'pending_receipt';
        confirmText = '确认发货该订单吗？';
        break;
      case 'cancel':
        newStatus = 'cancelled';
        confirmText = '确认取消该订单吗？';
        break;
      default:
        return;
    }
    
    wx.showModal({
      title: '提示',
      content: confirmText,
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus(id, newStatus);
        }
      }
    });
  },

  /**
   * 更新订单状态
   */
  updateOrderStatus(orderId, status) {
    wx.showLoading({ title: '处理中...' });
    
    merchantApi.processOrder(orderId, status)
      .then(res => {
        wx.hideLoading();
        
        if (res.success) {
          wx.showToast({
            title: '操作成功',
            icon: 'success'
          });
          
          // 刷新订单列表
          this.loadOrders(true);
        } else {
          wx.showToast({
            title: res.message || '操作失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('处理订单失败', err);
        wx.showToast({
          title: '处理订单失败',
          icon: 'none'
        });
      });
  },

  /**
   * 查看订单详情
   */
  viewOrderDetail(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/merchant/order-detail/order-detail?id=${orderId}`
    });
  },

  /**
   * 复制订单号
   */
  copyOrderNo(e) {
    const orderNo = e.currentTarget.dataset.no;
    wx.setClipboardData({
      data: orderNo,
      success: () => {
        wx.showToast({
          title: '订单号已复制',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadOrders(true);
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      const nextPage = this.data.page + 1;
      this.setData({
        page: nextPage
      });
      this.loadOrders(false); // 确保不是刷新模式
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})