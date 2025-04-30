const app = getApp();
const { merchantApi } = require('../../../utils/api');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: true,
    orderId: null,
    orderDetail: null,
    // 退款处理相关
    showRefundModal: false,
    refundAction: 'confirm', // confirm或reject
    refundRemark: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.id) {
      this.setData({
        orderId: options.id
      });
      this.loadOrderDetail();
    } else {
      wx.showToast({
        title: '订单ID不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 加载订单详情
   */
  loadOrderDetail() {
    this.setData({ loading: true });
    
    merchantApi.getMerchantOrderDetail(this.data.orderId)
      .then(res => {
        if (res.success) {
          this.setData({
            orderDetail: res.data,
            loading: false
          });
        } else {
          wx.showToast({
            title: res.message || '获取订单详情失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      })
      .catch(err => {
        console.error('获取订单详情失败', err);
        wx.showToast({
          title: '获取订单详情失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      });
  },

  /**
   * 处理订单
   */
  processOrder(e) {
    const action = e.currentTarget.dataset.action;
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
          this.updateOrderStatus(newStatus);
        }
      }
    });
  },

  /**
   * 更新订单状态
   */
  updateOrderStatus(status) {
    wx.showLoading({ title: '处理中...' });
    
    merchantApi.processOrder(this.data.orderId, status)
      .then(res => {
        wx.hideLoading();
        
        if (res.success) {
          wx.showToast({
            title: '操作成功',
            icon: 'success'
          });
          
          // 重新加载订单详情
          this.loadOrderDetail();
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
   * 复制文本
   */
  copyText(e) {
    const text = e.currentTarget.dataset.text;
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: '复制成功',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 拨打电话
   */
  callPhone(e) {
    const phone = e.currentTarget.dataset.phone;
    if (phone) {
      wx.makePhoneCall({
        phoneNumber: phone
      });
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadOrderDetail();
    wx.stopPullDownRefresh();
  },

  /**
   * 显示确认退款弹窗
   */
  showRefundConfirm() {
    this.setData({
      showRefundModal: true,
      refundAction: 'confirm',
      refundRemark: ''
    });
  },
  
  /**
   * 显示拒绝退款弹窗
   */
  showRefundReject() {
    this.setData({
      showRefundModal: true,
      refundAction: 'reject',
      refundRemark: ''
    });
  },
  
  /**
   * 隐藏退款处理弹窗
   */
  hideRefundModal() {
    this.setData({
      showRefundModal: false
    });
  },
  
  /**
   * 输入退款处理备注
   */
  inputRefundRemark(e) {
    this.setData({
      refundRemark: e.detail.value
    });
  },
  
  /**
   * 处理退款
   */
  handleRefund() {
    const { orderId, refundAction, refundRemark } = this.data;
    
    wx.showLoading({ title: '处理中...' });
    
    merchantApi.processRefund(orderId, refundAction, refundRemark)
      .then(res => {
        wx.hideLoading();
        
        if (res.success) {
          this.hideRefundModal();
          wx.showToast({
            title: refundAction === 'confirm' ? '已确认退款' : '已拒绝退款',
            icon: 'success'
          });
          
          // 重新加载订单详情
          setTimeout(() => {
            this.loadOrderDetail();
          }, 1500);
        } else {
          wx.showToast({
            title: res.message || '处理失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('处理退款失败', err);
        wx.showToast({
          title: '处理失败，请重试',
          icon: 'none'
        });
      });
  }
}) 