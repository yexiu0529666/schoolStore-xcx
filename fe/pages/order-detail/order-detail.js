const app = getApp();
const utils = require('../../utils/util.js');
const { orderApi } = require('../../utils/api');

Page({
  data: {
    orderId: '',
    order: null,
    loading: true,
    error: false,
    errorMsg: '',
    // 退款相关
    showRefundModal: false,
    selectedReason: '',
    refundRemark: ''
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({
        orderId: options.id
      });
      this.fetchOrderDetail();
    } else {
      this.setData({
        loading: false,
        error: true,
        errorMsg: '订单ID不存在'
      });
    }
  },

  onPullDownRefresh: function () {
    this.fetchOrderDetail();
    wx.stopPullDownRefresh();
  },

  onShareAppMessage: function () {
    return {
      title: '订单详情',
      path: '/pages/order-detail/order-detail?id=' + this.data.orderId
    };
  },

  fetchOrderDetail: function () {
    const that = this;
    that.setData({ loading: true, error: false });

    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/order/detail/${that.data.orderId}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: function (res) {
        console.log('[ORDER_DETAIL] 订单详情响应:', res.data);
        if (res.data && res.data.success) {
          // 格式化日期时间
          const order = res.data.data;
          order.created_at_formatted = utils.formatTime(new Date(order.create_time));
          order.paid_at_formatted = order.payment_time ? utils.formatTime(new Date(order.payment_time)) : '';
          order.shipped_at_formatted = order.shipping_time ? utils.formatTime(new Date(order.shipping_time)) : '';
          order.completed_at_formatted = order.completion_time ? utils.formatTime(new Date(order.completion_time)) : '';
          order.is_reviewed = order.items[0].is_reviewed;
          // Map status to human-readable text
          const statusMap = {
            'pending_payment': '待付款',
            'pending_shipment': '待发货',
            'pending_receipt': '待收货',
            'completed': '已完成',
            'cancelled': '已取消',
            'refunding': '退款中',
            'refunded': '已退款'
          };
          
          order.status_text = statusMap[order.status] || '未知状态';
          
          that.setData({
            loading: false,
            order: order
          });
        } else {
          that.setData({
            loading: false,
            error: true,
            errorMsg: res.data?.message || '获取订单详情失败'
          });
        }
      },
      fail: function (err) {
        console.error('[ORDER_DETAIL] 获取订单详情失败:', err);
        that.setData({
          loading: false,
          error: true,
          errorMsg: '网络请求失败，请检查网络连接'
        });
      }
    });
  },

  // 复制订单号
  copyOrderNo: function () {
    wx.setClipboardData({
      data: this.data.order.order_no,
      success: function () {
        wx.showToast({
          title: '订单号已复制',
          icon: 'success'
        });
      }
    });
  },



  // 取消订单
  cancelOrder: function () {
    const that = this;
    wx.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？',
      success: function (res) {
        if (res.confirm) {
          wx.request({
            url: `${app.globalData.apiBaseUrl}/api/order/cancel/${that.data.orderId}`,
            method: 'POST',
            header: {
              'Authorization': `Bearer ${wx.getStorageSync('token')}`
            },
            success: function (res) {
              console.log('[ORDER_DETAIL] 取消订单响应:', res.data);
              if (res.data && res.data.success) {
                wx.showToast({
                  title: '订单已取消',
                  icon: 'success',
                  duration: 2000,
                  success: function () {
                    setTimeout(function () {
                      that.fetchOrderDetail();
                    }, 2000);
                  }
                });
              } else {
                wx.showToast({
                  title: res.data?.message || '取消订单失败',
                  icon: 'none'
                });
              }
            },
            fail: function (err) {
              console.error('[ORDER_DETAIL] 取消订单请求失败:', err);
              wx.showToast({
                title: '网络请求失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 申请退款 - 打开弹窗
  requestRefund: function () {
    this.setData({
      showRefundModal: true,
      selectedReason: '',
      refundRemark: ''
    });
  },

  // 关闭退款弹窗
  closeRefundModal: function () {
    this.setData({
      showRefundModal: false
    });
  },

  // 选择退款原因
  selectRefundReason: function (e) {
    this.setData({
      selectedReason: e.currentTarget.dataset.reason
    });
  },

  // 输入退款备注
  inputRefundRemark: function (e) {
    this.setData({
      refundRemark: e.detail.value
    });
  },

  // 提交退款申请
  submitRefund: function () {
    const { orderId, selectedReason, refundRemark } = this.data;
    const fullReason = refundRemark 
      ? `${selectedReason}：${refundRemark}`
      : selectedReason;
    
    wx.showLoading({ title: '提交中' });
    
    orderApi.applyRefund(orderId, fullReason)
      .then(res => {
        wx.hideLoading();
        if (res.success) {
          wx.showToast({
            title: '退款申请已提交',
            icon: 'success',
            duration: 2000
          });
          this.setData({
            showRefundModal: false
          });
          setTimeout(() => {
            this.fetchOrderDetail();
          }, 2000);
        } else {
          wx.showToast({
            title: res.message || '申请退款失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      });
  },

  // 去支付
  goPay: function () {
    const that = this;
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/order/pay/${that.data.orderId}`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: function (res) {
        console.log('[ORDER_DETAIL] 支付订单响应:', res.data);
        if (res.data && res.data.success) {
          // 模拟支付成功
          wx.showLoading({
            title: '支付处理中',
          });
          
          setTimeout(function() {
            wx.hideLoading();
            wx.showToast({
              title: '支付成功',
              icon: 'success',
              duration: 2000,
              success: function () {
                setTimeout(function () {
                  that.fetchOrderDetail();
                }, 2000);
              }
            });
          }, 1500);
        } else {
          wx.showToast({
            title: res.data?.message || '支付失败',
            icon: 'none'
          });
        }
      },
      fail: function (err) {
        console.error('[ORDER_DETAIL] 支付订单请求失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },

  // 确认收货
  confirmReceive: function () {
    const that = this;
    wx.showModal({
      title: '确认收货',
      content: '确定已收到商品吗？',
      success: function (res) {
        if (res.confirm) {
          wx.request({
            url: `${app.globalData.apiBaseUrl}/api/order/confirm/${that.data.orderId}`,
            method: 'POST',
            header: {
              'Authorization': `Bearer ${wx.getStorageSync('token')}`
            },
            success: function (res) {
              console.log('[ORDER_DETAIL] 确认收货响应:', res.data);
              if (res.data && res.data.success) {
                wx.showToast({
                  title: '已确认收货',
                  icon: 'success',
                  duration: 2000,
                  success: function () {
                    setTimeout(function () {
                      that.fetchOrderDetail();
                    }, 2000);
                  }
                });
              } else {
                wx.showToast({
                  title: res.data?.message || '确认收货失败',
                  icon: 'none'
                });
              }
            },
            fail: function (err) {
              console.error('[ORDER_DETAIL] 确认收货请求失败:', err);
              wx.showToast({
                title: '网络请求失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 去评价
  goReview: function (e) {
    const orderId = parseInt(this.data.orderId);
    
    // 从按钮属性中获取orderItemId (支持两种命名方式)
    let orderItemId = e.currentTarget.dataset.orderItemId || e.currentTarget.dataset.itemId;
    if (orderItemId) {
      orderItemId = parseInt(orderItemId);
    }
    
    // 如果没有传递订单项ID，默认使用第一个商品
    if (!orderItemId && this.data.order && this.data.order.items.length > 0) {
      orderItemId = parseInt(this.data.order.items[0].id);
    }
    
    console.log('[ORDER_DETAIL] 去评价:', { orderItemId, orderId });
    
    if (orderItemId) {
      // Store parameters in globalData as a backup
      const app = getApp();
      app.globalData.pageParams = {
        orderItemId: orderItemId,
        orderId: orderId
      };
      
      // Navigate to the review page
      wx.navigateTo({
        url: `/pages/review/review?orderItemId=${orderItemId}&orderId=${orderId}`,
        fail: (res) => {
          console.error('[ORDER_DETAIL] 跳转到评价页失败:', res);
          wx.showToast({
            title: '无法打开评价页面',
            icon: 'none'
          });
        }
      });
    } else {
      wx.showToast({
        title: '无法评价，商品信息不存在',
        icon: 'none'
      });
    }
  },

  // 点击商品跳转到商品详情
  gotoGoodsDetail: function (e) {
    const goodsId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/product/product?id=' + goodsId
    });
  }
});