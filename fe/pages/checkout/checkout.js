const app = getApp();
const { addressApi, orderApi, cartApi, couponApi } = require('../../utils/api');

Page({
  data: {
    cartItems: [],
    addressList: [],
    selectedAddress: null,
    totalPrice: 0,
    remark: '',
    isSubmitting: false,
    isBuyNow: false,
    productInfo: null,
    // 优惠券相关
    availableCoupons: [],
    selectedCoupon: null,
    selectedCouponIndex: -1,
    showCouponModal: false,
    finalPrice: 0
  },

  onLoad: function (options) {
    // 判断是否是直接购买
    const isBuyNow = options.is_buy_now === 'true';
    
    if (isBuyNow && options.product_info) {
      // 直接购买：从URL参数中获取商品信息
      try {
        const productInfo = JSON.parse(decodeURIComponent(options.product_info));
        const totalPrice = (productInfo.price * productInfo.quantity).toFixed(2);
        this.setData({
          isBuyNow: true,
          productInfo: productInfo,
          cartItemIds: [],
          totalPrice: totalPrice,
          finalPrice: totalPrice
        });
        
        // 获取可用优惠券
        this.loadAvailableCoupons(totalPrice);
      } catch (e) {
        console.error('解析商品信息失败', e);
        wx.showToast({
          title: '商品信息错误',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } else {
      // 购物车结算：获取购物车商品ID
      const cartItemIds = options.cart_item_ids ? JSON.parse(options.cart_item_ids) : [];
      
      // 如果是数组，说明是多个购物车项
      // 如果是单个ID，转换为数组
      const itemIds = Array.isArray(cartItemIds) ? cartItemIds : [cartItemIds];
      
      this.setData({
        isBuyNow: false,
        cartItemIds: itemIds
      });
      
      // 加载购物车商品
      this.getCheckoutItems();
    }
    
    // 获取地址列表
    this.getAddressList();
  },

  onShow: function () {
    // 页面显示时刷新地址列表
    this.getAddressList();
  },

  // 加载数据
  loadData: function () {
    if (!this.data.isBuyNow) {
      this.getCheckoutItems();
    }
    this.getAddressList();
  },

  // 获取结算商品项
  getCheckoutItems: function () {
    const { cartItemIds } = this.data;
    
    wx.showLoading({
      title: '加载中',
    });
    
    cartApi.getCheckoutItems(cartItemIds).then(res => {
      wx.hideLoading();
      
      if (res.success) {
        const cartItems = res.data.items || [];
        const totalPrice = res.data.total_price || 0;
        
        this.setData({
          cartItems,
          totalPrice: totalPrice.toFixed(2),
          finalPrice: totalPrice.toFixed(2)
        });
        
        // 获取可用优惠券
        this.loadAvailableCoupons(totalPrice);
      } else {
        wx.showToast({
          title: res.message || '获取商品失败',
          icon: 'none'
        });
        
        // 失败后返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
      
      // 失败后返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    });
  },

  // 获取地址列表
  getAddressList: function () {
    addressApi.getAddressList().then(res => {
      if (res.success) {
        const addressList = res.data || [];
        
        // 查找默认地址
        let selectedAddress = addressList.find(address => address.is_default);
        
        // 如果没有默认地址，使用第一个地址
        if (!selectedAddress && addressList.length > 0) {
          selectedAddress = addressList[0];
        }
        
        this.setData({
          addressList,
          selectedAddress
        });
      }
    });
  },
  
  // 选择收货地址
  chooseAddress: function () {
    wx.navigateTo({
      url: '/pages/address/address?from=checkout'
    });
  },
  
  // 添加新地址
  addNewAddress: function () {
    wx.navigateTo({
      url: '/pages/edit-address/edit-address?from=checkout'
    });
  },
  
  // 设置备注
  onRemarkInput: function (e) {
    this.setData({
      remark: e.detail.value
    });
  },
  
  // 加载可用优惠券
  loadAvailableCoupons: function(totalAmount) {
    couponApi.getUserCoupons('unused').then(res => {
      if (res.success) {
        const allCoupons = res.data || [];
        let availableCoupons = [];
        
        // 获取当前结算商品的分类ID
        const categoryIds = this.getProductCategoryIds();
        console.log(categoryIds);
        // 过滤出满足金额条件且分类匹配的优惠券
        availableCoupons = allCoupons.filter(coupon => {
          // 金额条件：订单金额需大于等于优惠券使用门槛
          const isAmountValid = parseFloat(totalAmount) >= parseFloat(coupon.min_spend);
          
          // 分类条件：优惠券应用分类需包含在商品分类中
          // 如果优惠券没有指定分类(category_id为空或0)，则视为全场通用
          const isCategoryValid = !coupon.category_id || 
                                  coupon.category_id === 0 || 
                                  categoryIds.includes(parseInt(coupon.category_id));
          
          return isAmountValid && isCategoryValid;
        });
        
        this.setData({
          availableCoupons: availableCoupons
        });
      }
    }).catch(err => {
      console.error('获取优惠券失败', err);
    });
  },
  
  // 获取当前结算商品的分类ID
  getProductCategoryIds: function() {
    const { isBuyNow, productInfo, cartItems } = this.data;
    const categoryIds = [];
    
    if (isBuyNow && productInfo) {
      // 直接购买：获取单个商品的分类ID
      console.log("立即购买商品信息:", productInfo);
      if (productInfo.category_id) {
        categoryIds.push(parseInt(productInfo.category_id));
      } else {
        // 如果前端productInfo中没有category_id，尝试从商品详情API获取
        // 这可能会导致异步问题，所以在实际应用中应该在跳转到结算页前就加载好商品分类信息
        console.log("商品无分类信息，考虑在product-detail.js中传递完整商品信息");
      }
    } else {
      // 购物车结算：获取所有商品的分类ID
      console.log("购物车商品列表:", cartItems);
      cartItems.forEach(item => {
        if (item.category_id && !categoryIds.includes(parseInt(item.category_id))) {
          categoryIds.push(parseInt(item.category_id));
        }
      });
    }
    
    console.log("获取到的分类IDs:", categoryIds);
    return categoryIds;
  },
  
  // 显示优惠券选择器
  showCouponSelector: function() {
    this.setData({
      showCouponModal: true
    });
  },
  
  // 隐藏优惠券选择器
  hideCouponSelector: function() {
    this.setData({
      showCouponModal: false
    });
  },
  
  // 选择优惠券
  selectCoupon: function(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      selectedCouponIndex: index
    });
  },
  
  // 清除优惠券选择
  clearCouponSelection: function() {
    this.setData({
      selectedCoupon: null,
      selectedCouponIndex: -1,
      finalPrice: this.data.totalPrice
    });
    this.hideCouponSelector();
  },
  
  // 确认优惠券选择
  confirmCouponSelection: function() {
    const { selectedCouponIndex, availableCoupons, totalPrice } = this.data;
    
    if (selectedCouponIndex !== -1 && availableCoupons.length > 0) {
      const selectedCoupon = availableCoupons[selectedCouponIndex];
      // 计算优惠后价格
      const finalPrice = Math.max(0, parseFloat(totalPrice) - parseFloat(selectedCoupon.amount)).toFixed(2);
      
      this.setData({
        selectedCoupon: selectedCoupon,
        finalPrice: finalPrice
      });
    }
    
    this.hideCouponSelector();
  },
  
  // 验证优惠券是否适用于当前商品
  isCouponApplicable: function(coupon) {
    const categoryIds = this.getProductCategoryIds();
    
    // 如果没有商品分类信息，默认所有优惠券可用
    if (categoryIds.length === 0) {
      return true;
    }
    
    // 如果优惠券没有指定分类，则是全场通用
    if (!coupon.category_id || coupon.category_id === 0) {
      return true;
    }
    
    // 检查优惠券分类是否匹配商品分类
    return categoryIds.includes(parseInt(coupon.category_id));
  },
  
  // 提交订单
  submitOrder: function () {
    const { isBuyNow, productInfo, cartItemIds, selectedAddress, remark, isSubmitting, selectedCoupon, finalPrice } = this.data;
    
    // 防止重复提交
    if (isSubmitting) return;
    
    // 检查是否选择了地址
    if (!selectedAddress) {
      return wx.showToast({
        title: '请选择收货地址',
        icon: 'none'
      });
    }
    
    this.setData({ isSubmitting: true });
    
    wx.showLoading({ title: '提交中' });

    // 准备订单数据
    let orderData = {
      address_id: selectedAddress.id,
      remark: remark,
      final_price: finalPrice // 添加实际支付金额
    };
    
    // 添加优惠券信息
    if (selectedCoupon) {
      orderData.coupon_id = selectedCoupon.id;
    }
    
    // 根据不同场景调用不同的创建订单接口
    let orderPromise;
    
    if (isBuyNow) {
      // 直接购买场景
      orderData.product_id = productInfo.product_id;
      orderData.quantity = productInfo.quantity;
      orderData.spec_id = productInfo.spec_id;
      orderPromise = orderApi.createDirectOrder(orderData);
    } else {
      // 购物车结算场景
      orderData.cart_item_ids = cartItemIds;
      orderPromise = orderApi.createOrder(orderData);
    }
    
    orderPromise.then(res => {
      wx.hideLoading();
      
      if (res.success) {
        const { order_id, order_no } = res.data;
        
        // 提示创建成功
        wx.showToast({
          title: '订单创建成功',
          icon: 'success',
          duration: 1500
        });
        
        // 标记购物车需要刷新
        app.globalData.cartRefresh = true;
        
        // 跳转到订单详情页面
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/order-detail/order-detail?id=${order_id}`
          });
        }, 1500);
      } else {
        this.setData({ isSubmitting: false });
        wx.showToast({
          title: res.message || '创建订单失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      this.setData({ isSubmitting: false });
      wx.showToast({
        title: err.message || '创建订单失败',
        icon: 'none'
      });
    });
  },
  
  // 跳转到支付页面 (已废弃，保留以备后续使用)
  goToPay: function (orderId) {
    // 直接跳转到订单详情页
    wx.redirectTo({
      url: `/pages/order-detail/order-detail?id=${orderId}`
    });
  }
}) 