const app = getApp();
const { merchantApi, productApi } = require('../../../utils/api');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    productId: null,
    isEdit: false,
    product: {
      id: '',
      name: '',
      category_id: '',
      price: '',
      original_price: '',
      stock: '',
      main_image: '',
      description: '',
      is_on_sale: true,
      is_hot: false,
      is_new: false,
      is_recommend: false,
      gallery: [],
      specs: []
    },
    selectedCategoryName: '',
    categories: [],
    imageList: [],
    isSubmitting: false,
    tempMainImage: '',
    tempGalleryImages: [],
    tempImages: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查是否有商家权限
    this.checkMerchantAuth();
    
    // 获取商品分类
    this.loadCategories();
    
    // 如果有商品ID，则是编辑模式
    if (options.id) {
      const productId = options.id;
      this.setData({
        productId: productId,
        isEdit: true,
        loading: true
      });
      
      wx.setNavigationBarTitle({
        title: '编辑商品'
      });
      
      // 加载商品详情
      this.loadProductDetail(productId);
    } else {
      wx.setNavigationBarTitle({
        title: '添加商品'
      });
    }
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
   * 加载商品分类
   */
  loadCategories() {
    productApi.getCategories()
      .then(res => {
        if (res.success) {
          console.log('加载的分类列表:', res.data);
          
          // 确保分类ID是字符串类型
          const categories = res.data.map(category => ({
            ...category,
            id: String(category.id)
          }));
          
          this.setData({
            categories: categories
          }, () => {
            // 加载完分类后，如果已经选择了分类，刷新显示
            if (this.data.product.category_id) {
              console.log('已选分类ID:', this.data.product.category_id);
              
              // 查找分类名称
              const category = this.data.categories.find(item => 
                String(item.id) === String(this.data.product.category_id));
              
              if (category) {
                this.setData({
                  selectedCategoryName: category.name
                });
                console.log('设置分类名称:', category.name);
              }
              
              // 强制刷新
              this.setData({
                'product.category_id': String(this.data.product.category_id)
              });
            }
          });
          
          console.log('处理后的分类列表:', this.data.categories);
        } else {
          wx.showToast({
            title: res.message || '获取分类失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        console.error('获取商品分类失败', err);
        wx.showToast({
          title: '获取商品分类失败',
          icon: 'none'
        });
      });
  },

  /**
   * 加载商品详情
   */
  loadProductDetail(productId) {
    productApi.getProductDetail(productId)
      .then(res => {
        if (res.success) {
          const productData = res.data;
          const imageList = productData.images || [];
          
          console.log('加载的商品详情:', productData);
          
          this.setData({
            product: {
              id: productData.id || '',
              name: productData.name || '',
              category_id: productData.category_id ? String(productData.category_id) : '',
              price: productData.price || '',
              original_price: productData.original_price || '',
              stock: productData.stock || '',
              main_image: productData.main_image || '',
              description: productData.description || '',
              is_on_sale: productData.is_on_sale === false ? false : true,
              is_hot: productData.is_hot === true ? true : false,
              is_new: productData.is_new === true ? true : false,
              is_recommend: productData.is_recommend === true ? true : false,
              gallery: imageList,
              specs: productData.specs || []
            },
            imageList: imageList,
            loading: false
          }, () => {
            // 如果有分类ID，获取并设置分类名称
            if (this.data.product.category_id && this.data.categories.length > 0) {
              const categoryId = this.data.product.category_id;
              // 查找分类名称
              const category = this.data.categories.find(item => String(item.id) === String(categoryId));
              if (category) {
                this.setData({
                  selectedCategoryName: category.name
                });
                console.log('设置分类名称:', category.name);
              }
            }
          });
          
          console.log('设置后的商品数据:', this.data.product);
        } else {
          wx.showToast({
            title: res.message || '获取商品详情失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      })
      .catch(err => {
        console.error('获取商品详情失败', err);
        wx.showToast({
          title: '获取商品详情失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      });
  },

  /**
   * 输入字段变化处理
   */
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    this.setData({
      [`product.${field}`]: value
    });
  },

  /**
   * 切换上架状态
   */
  toggleOnSale() {
    this.setData({
      'product.is_on_sale': !this.data.product.is_on_sale
    });
  },

  /**
   * 切换热卖状态
   */
  toggleHot() {
    this.setData({
      'product.is_hot': !this.data.product.is_hot
    });
  },

  /**
   * 切换新品状态
   */
  toggleNew() {
    this.setData({
      'product.is_new': !this.data.product.is_new
    });
  },

  /**
   * 切换推荐状态
   */
  toggleRecommend() {
    this.setData({
      'product.is_recommend': !this.data.product.is_recommend
    });
  },

  /**
   * 选择分类
   */
  onCategoryChange(e) {
    try {
      const index = parseInt(e.detail.value);
      if (isNaN(index) || index < 0 || index >= this.data.categories.length) {
        console.error('无效的分类索引:', index);
        return;
      }
      
      // 从categories数组中获取选中的分类ID和名称
      const categoryId = String(this.data.categories[index].id);
      const categoryName = this.data.categories[index].name;
      
      console.log('选择分类:', {
        index: index,
        categoryId: categoryId,
        categoryName: categoryName
      });
      
      // 同时设置分类ID和分类名称
      this.setData({
        'product.category_id': categoryId,
        selectedCategoryName: categoryName
      }, () => {
        // 设置完成后立即验证
        console.log('设置后的分类ID:', this.data.product.category_id);
        console.log('设置后的分类名称:', this.data.selectedCategoryName);
      });
    } catch (error) {
      console.error('选择分类出错:', error);
      wx.showToast({
        title: '选择分类出错',
        icon: 'none'
      });
    }
  },

  /**
   * 获取分类名称的辅助方法
   */
  getCategoryName() {
    try {
      if (!this.data.product.category_id) {
        return '请选择分类';
      }
      
      const categoryId = String(this.data.product.category_id);
      console.log('查找分类名称:', {
        categoryId: categoryId,
        categoriesCount: this.data.categories ? this.data.categories.length : 0
      });
      
      if (!this.data.categories || this.data.categories.length === 0) {
        return '请选择分类';
      }
      
      // 直接遍历查找
      for (let i = 0; i < this.data.categories.length; i++) {
        const category = this.data.categories[i];
        if (String(category.id) === categoryId) {
          console.log('找到匹配的分类:', category.name);
          return category.name;
        }
      }
      
      console.log('未找到匹配的分类ID:', categoryId);
      return '请选择分类';
    } catch (error) {
      console.error('获取分类名称出错:', error);
      return '请选择分类';
    }
  },

  /**
   * 上传主图
   */
  uploadMainImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        // 设置临时预览
        this.setData({
          tempMainImage: tempFilePath,
          'product.main_image': tempFilePath // 临时显示，实际上传后会替换
        });
        
        // 立即上传到服务器
        wx.showLoading({
          title: '上传中...',
        });
        
        this.uploadFile(tempFilePath, 'product')
          .then(imageUrl => {
            wx.hideLoading();
            // 更新为服务器返回的URL
            this.setData({
              tempMainImage: '', // 清空临时路径
              'product.main_image': imageUrl // 使用服务器返回的URL
            });
            
            wx.showToast({
              title: '主图上传成功',
              icon: 'success'
            });
          })
          .catch(err => {
            wx.hideLoading();
            console.error('主图上传失败:', err);
            wx.showToast({
              title: '主图上传失败',
              icon: 'none'
            });
          });
      }
    });
  },

  /**
   * 上传商品图片
   */
  uploadProductImage() {
    const maxCount = 9 - this.data.product.gallery.length;
    
    if (maxCount <= 0) {
      wx.showToast({
        title: '最多上传9张图片',
        icon: 'none'
      });
      return;
    }
    
    wx.chooseMedia({
      count: maxCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFiles.map(file => file.tempFilePath);
        
        // 存储临时图片路径，临时显示
        this.setData({
          tempGalleryImages: [...this.data.tempGalleryImages, ...tempFilePaths],
          'product.gallery': [...this.data.product.gallery, ...tempFilePaths] // 临时显示
        });
        
        // 立即上传所有选中的图片
        wx.showLoading({
          title: '上传中...',
        });
        
        // 创建每个图片的上传Promise
        const uploadPromises = tempFilePaths.map(path => this.uploadFile(path, 'gallery'));
        
        Promise.all(uploadPromises)
          .then(imageUrls => {
            wx.hideLoading();
            
            // 更新为服务器返回的URL
            const existingGallery = this.data.product.gallery.filter(img => 
              !this.data.tempGalleryImages.includes(img) || 
              !tempFilePaths.includes(img)
            );
            
            this.setData({
              tempGalleryImages: [], // 清空临时路径
              'product.gallery': [...existingGallery, ...imageUrls] // 使用服务器返回的URL
            });
            
            wx.showToast({
              title: '图片上传成功',
              icon: 'success'
            });
          })
          .catch(err => {
            wx.hideLoading();
            console.error('图片上传失败:', err);
            wx.showToast({
              title: '图片上传失败',
              icon: 'none'
            });
          });
      }
    });
  },

  /**
   * 删除临时主图
   */
  deleteMainImage() {
    this.setData({
      tempMainImage: '',
      'product.main_image': ''
    });
  },

  /**
   * 删除已有主图
   */
  deleteExistingMainImage() {
    this.setData({
      'product.main_image': ''
    });
  },

  /**
   * 删除临时相册图片
   */
  deleteGalleryImage(e) {
    const index = e.currentTarget.dataset.index;
    const tempGalleryImages = [...this.data.tempGalleryImages];
    
    tempGalleryImages.splice(index, 1);
    
    // 更新临时图片和显示
    this.setData({
      tempGalleryImages,
      'product.gallery': [...this.data.product.gallery.filter(item => !this.data.tempGalleryImages.includes(item)), ...tempGalleryImages]
    });
  },

  /**
   * 删除已有相册图片
   */
  deleteExistingGalleryImage(e) {
    const { index } = e.currentTarget.dataset;
    const gallery = [...this.data.product.gallery];
    
    gallery.splice(index, 1);
    
    this.setData({
      'product.gallery': gallery
    });
  },

  /**
   * 处理价格输入，保证只能输入数字和小数点
   */
  handlePriceInput(e) {
    const { field } = e.currentTarget.dataset;
    let { value } = e.detail;
    
    // 价格格式化，只允许数字和小数点，且小数点后最多两位
    value = value.replace(/[^\d.]/g, '');
    
    // 处理多个小数点的情况
    if (value.split('.').length > 2) {
      value = value.substr(0, value.lastIndexOf('.'));
    }
    
    // 处理小数点后超过两位的情况
    if (value.indexOf('.') !== -1) {
      value = value.substr(0, value.indexOf('.') + 3);
    }
    
    this.setData({
      [`product.${field}`]: value
    });
  },
  
  /**
   * 处理数量输入，只能输入整数
   */
  handleStockInput(e) {
    const { field } = e.currentTarget.dataset;
    let { value } = e.detail;
    
    // 只允许输入整数
    value = value.replace(/\D/g, '');
    
    this.setData({
      [`product.${field}`]: value
    });
  },

  /**
   * 上传单个文件
   */
  uploadFile(filePath, type) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${app.globalData.apiBaseUrl}/api/upload/`,
        filePath: filePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        },
        formData: {
          'type': type
        },
        success: function(res) {
          try {
            const data = JSON.parse(res.data);
            console.log('上传响应:', data);
            
            if (data.success && data.data && data.data.url) {
              resolve(data.data.url);
            } else {
              reject(new Error(data.message || '上传失败'));
            }
          } catch (e) {
            console.error('解析上传响应失败:', e, res.data);
            reject(new Error('解析响应失败'));
          }
        },
        fail: function(err) {
          console.error('上传失败:', err);
          reject(new Error('上传失败'));
        }
      });
    });
  },

  /**
   * 添加规格
   */
  addSpec() {
    let specs = this.data.product.specs || [];
    
    // 创建一个新规格
    const newSpec = {
      id: Date.now(), // 临时ID，保存时后端会重新分配
      name: '',
      value: '',
      price: this.data.product.price || '',
      stock: 0
    };
    
    specs.push(newSpec);
    
    this.setData({
      'product.specs': specs
    });
  },
  
  /**
   * 删除规格
   */
  deleteSpec(e) {
    const index = e.currentTarget.dataset.index;
    let specs = this.data.product.specs;
    
    specs.splice(index, 1);
    
    this.setData({
      'product.specs': specs
    });
  },
  
  /**
   * 处理规格名称变化
   */
  onSpecNameChange(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    
    this.setData({
      [`product.specs[${index}].name`]: value
    });
  },
  
  /**
   * 处理规格值变化
   */
  onSpecValueChange(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    
    this.setData({
      [`product.specs[${index}].value`]: value
    });
  },
  
  /**
   * 处理规格价格变化
   */
  onSpecPriceChange(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    
    // 验证价格格式
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
      this.setData({
        [`product.specs[${index}].price`]: value
      });
    }
  },
  
  /**
   * 处理规格库存变化
   */
  onSpecStockChange(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    
    // 验证库存格式（必须是非负整数）
    if (value === '' || (!isNaN(parseInt(value)) && parseInt(value) >= 0)) {
      this.setData({
        [`product.specs[${index}].stock`]: parseInt(value) || 0
      });
    }
  },

  /**
   * 校验规格库存总量
   */
  validateSpecsStock() {
    // 如果没有规格，则无需验证
    if (!this.data.product.specs || this.data.product.specs.length === 0) {
      return true;
    }
    
    // 计算所有规格库存总和
    const totalSpecsStock = this.data.product.specs.reduce((sum, spec) => {
      return sum + (parseInt(spec.stock) || 0);
    }, 0);
    
    // 获取商品总库存
    const productStock = parseInt(this.data.product.stock) || 0;
    
    console.log('规格库存总量校验:', {
      总库存: productStock,
      规格库存总量: totalSpecsStock,
      是否超出: totalSpecsStock > productStock
    });
    
    // 规格库存总量不应超过商品总库存
    return totalSpecsStock <= productStock;
  },

  /**
   * 保存商品
   */
  saveProduct() {
    // 先进行基本验证
    if (!this.data.product.name) {
      wx.showToast({
        title: '请输入商品名称',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.product.price) {
      wx.showToast({
        title: '请输入商品价格',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.product.stock && !this.hasValidSpecs()) {
      wx.showToast({
        title: '请输入商品库存',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.product.category_id) {
      wx.showToast({
        title: '请选择商品分类',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.product.main_image && !this.data.tempMainImage) {
      wx.showToast({
        title: '请上传商品主图',
        icon: 'none'
      });
      return;
    }
    
    // 验证规格
    if (this.data.product.specs && this.data.product.specs.length > 0) {
      for (let i = 0; i < this.data.product.specs.length; i++) {
        const spec = this.data.product.specs[i];
        if (!spec.name) {
          wx.showToast({
            title: `规格${i + 1}：请输入规格名称`,
            icon: 'none'
          });
          return;
        }
        
        if (!spec.value) {
          wx.showToast({
            title: `规格${i + 1}：请输入规格值`,
            icon: 'none'
          });
          return;
        }
        
        if (!spec.price) {
          wx.showToast({
            title: `规格${i + 1}：请输入规格价格`,
            icon: 'none'
          });
          return;
        }
      }
      
      // 验证规格库存总量不超过商品总库存
      if (!this.validateSpecsStock()) {
        wx.showToast({
          title: '规格库存总量不能超过商品总库存',
          icon: 'none'
        });
        return;
      }
    }
    
    // 开始提交
    this.setData({
      isSubmitting: true
    });
    
    // 先上传图片，再提交表单
    this.uploadAllImages()
      .then(() => {
        return this.submitProductData();
      })
      .then(res => {
        // 保存成功
        wx.showToast({
          title: this.data.isEdit ? '更新成功' : '添加成功',
          icon: 'success',
          duration: 2000,
          success: () => {
            setTimeout(() => {
              // 返回上一页
              wx.navigateBack();
            }, 2000);
          }
        });
      })
      .catch(err => {
        console.error('保存商品失败', err);
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        });
        this.setData({
          isSubmitting: false
        });
      });
  },
  
  /**
   * 检查是否有有效的规格
   */
  hasValidSpecs() {
    if (!this.data.product.specs || this.data.product.specs.length === 0) {
      return false;
    }
    
    // 检查是否至少有一个规格有效（有名称、值、价格和库存）
    return this.data.product.specs.some(spec => 
      spec.name && spec.value && spec.price && spec.stock > 0
    );
  },
  
  /**
   * 提交商品数据
   */
  submitProductData() {
    // 构建提交的数据
    const productData = {
      name: this.data.product.name,
      price: parseFloat(this.data.product.price),
      original_price: this.data.product.original_price ? parseFloat(this.data.product.original_price) : null,
      stock: parseInt(this.data.product.stock) || 0,
      category_id: this.data.product.category_id,
      main_image: this.data.product.main_image,
      description: this.data.product.description,
      is_on_sale: this.data.product.is_on_sale,
      is_hot: this.data.product.is_hot,
      is_new: this.data.product.is_new,
      is_recommend: this.data.product.is_recommend,
      images: this.data.product.gallery || [],
      specs: this.data.product.specs || []
    };

    // 处理规格数据
    if (productData.specs && productData.specs.length > 0) {
      productData.specs = productData.specs.map(spec => ({
        name: spec.name,
        value: spec.value,
        price: parseFloat(spec.price),
        stock: parseInt(spec.stock) || 0,
        id: spec.id
      }));
    }
    
    console.log('提交的商品数据:', productData);
    console.log('编辑模式:', this.data.isEdit);
    console.log('商品ID:', this.data.productId);
    
    // 根据是否是编辑模式，调用不同的API
    if (this.data.isEdit) {
      console.log('正在更新商品，ID:', this.data.productId, '数据:', productData);
      return merchantApi.updateProduct(this.data.productId, productData);
    } else {
      console.log('正在添加商品，数据:', productData);
      return merchantApi.addProduct(productData);
    }
  },

  /**
   * 取消编辑
   */
  cancelEdit() {
    wx.navigateBack();
  },

  /**
   * 上传所有图片
   */
  uploadAllImages() {
    return new Promise(async (resolve, reject) => {
      try {
        // 上传主图（如果有）
        if (this.data.tempMainImage) {
          const mainImageRes = await this.uploadFile(this.data.tempMainImage, 'main');
          this.setData({
            'product.main_image': mainImageRes,
            tempMainImage: ''
          });
        }
        
        // 上传相册图片（如果有）
        if (this.data.tempGalleryImages && this.data.tempGalleryImages.length > 0) {
          const uploadPromises = this.data.tempGalleryImages.map(image => 
            this.uploadFile(image, 'gallery')
          );
          
          const galleryResults = await Promise.all(uploadPromises);
          
          // 合并已有图片和新上传的图片
          const currentGallery = this.data.product.gallery || [];
          const newGallery = [...currentGallery, ...galleryResults];
          
          this.setData({
            'product.gallery': newGallery,
            tempGalleryImages: []
          });
        }
        
        resolve();
      } catch (error) {
        console.error('上传图片失败', error);
        reject(error);
      }
    });
  }
}); 