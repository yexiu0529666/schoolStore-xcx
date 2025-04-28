from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.dialects.mysql import TEXT
from passlib.hash import pbkdf2_sha256
import enum

# 初始化SQLAlchemy
db = SQLAlchemy()

class User(db.Model):
    """
    用户模型
    """
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=True)
    phone = db.Column(db.String(20), unique=True, nullable=True)
    email = db.Column(db.String(100), unique=True, nullable=True)
    password_hash = db.Column(db.String(128), nullable=False)
    nickname = db.Column(db.String(50), nullable=True)
    avatar = db.Column(db.String(255), nullable=True)
    is_merchant = db.Column(db.Boolean, default=False)
    openid = db.Column(db.String(100), unique=True, nullable=True)  # 微信openid
    gender = db.Column(db.String(10), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联关系
    carts = db.relationship('Cart', backref='user', lazy='dynamic')
    addresses = db.relationship('Address', backref='user', lazy='dynamic')
    orders = db.relationship('Order', backref='user', lazy='dynamic')
    merchant_info = db.relationship('MerchantInfo', backref='user', uselist=False)
    
    @property
    def password(self):
        raise AttributeError('password is not a readable attribute')
    
    @password.setter
    def password(self, password):
        self.password_hash = pbkdf2_sha256.hash(password)
    
    def verify_password(self, password):
        return pbkdf2_sha256.verify(password, self.password_hash)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'phone': self.phone,
            'email': self.email,
            'nickname': self.nickname,
            'avatar': self.avatar,
            'is_merchant': self.is_merchant,
            'gender': self.gender,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class MerchantInfo(db.Model):
    """
    商家信息模型
    """
    __tablename__ = 'merchant_info'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    shop_name = db.Column(db.String(100), nullable=False)
    shop_logo = db.Column(db.String(255), nullable=True)
    shop_banner = db.Column(db.String(255), nullable=True)
    shop_desc = db.Column(db.String(500), nullable=True)
    contact_phone = db.Column(db.String(20), nullable=False)
    contact_email = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联关系
    products = db.relationship('Product', backref='merchant', lazy='dynamic')
    coupons = db.relationship('Coupon', backref='merchant', lazy='dynamic')

class Address(db.Model):
    """
    收货地址模型
    """
    __tablename__ = 'addresses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    province = db.Column(db.String(50), nullable=False)
    city = db.Column(db.String(50), nullable=False)
    district = db.Column(db.String(50), nullable=False)
    detail = db.Column(db.String(255), nullable=False)
    is_default = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)


class Product(db.Model):
    """
    商品模型
    """
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    merchant_id = db.Column(db.Integer, db.ForeignKey('merchant_info.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('product_category.id'), nullable=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    original_price = db.Column(db.Float, nullable=True)
    description = db.Column(TEXT, nullable=True)
    stock = db.Column(db.Integer, default=0)
    sales = db.Column(db.Integer, default=0)
    main_image = db.Column(db.String(255), nullable=False)
    is_on_sale = db.Column(db.Boolean, default=True)
    is_new = db.Column(db.Boolean, default=False)
    is_hot = db.Column(db.Boolean, default=False)
    is_recommend = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联关系
    images = db.relationship('ProductImage', backref='product', lazy='dynamic')
    specs = db.relationship('ProductSpec', backref='product', lazy='dynamic')
    cart_items = db.relationship('CartItem', backref='product', lazy='dynamic')
    order_items = db.relationship('OrderItem', backref='product', lazy='dynamic')

class ProductImage(db.Model):
    """
    商品图片模型
    """
    __tablename__ = 'product_images'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    image_url = db.Column(db.String(255), nullable=False)
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.now)

class ProductSpec(db.Model):
    """
    商品规格模型
    """
    __tablename__ = 'product_specs'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    value = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Float, nullable=False)
    stock = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

class Cart(db.Model):
    """
    购物车模型
    """
    __tablename__ = 'carts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联关系
    items = db.relationship('CartItem', backref='cart', lazy='dynamic')

class CartItem(db.Model):
    """
    购物车项模型
    """
    __tablename__ = 'cart_items'
    
    id = db.Column(db.Integer, primary_key=True)
    cart_id = db.Column(db.Integer, db.ForeignKey('carts.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    spec_id = db.Column(db.Integer, db.ForeignKey('product_specs.id'), nullable=True)
    quantity = db.Column(db.Integer, default=1)
    selected = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

class OrderStatus(enum.Enum):
    """
    订单状态枚举
    """
    PENDING_PAYMENT = 'pending_payment'  # 待付款
    PENDING_SHIPMENT = 'pending_shipment'  # 待发货
    PENDING_RECEIPT = 'pending_receipt'  # 待收货
    COMPLETED = 'completed'  # 已完成
    CANCELLED = 'cancelled'  # 已取消
    REFUNDING = 'refunding'  # 退款中
    REFUNDED = 'refunded'  # 已退款

class Order(db.Model):
    """
    订单模型
    """
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    order_no = db.Column(db.String(50), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    payment_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.Enum(OrderStatus), default=OrderStatus.PENDING_PAYMENT)
    address_id = db.Column(db.Integer, db.ForeignKey('addresses.id'), nullable=False)
    coupon_id = db.Column(db.Integer, db.ForeignKey('user_coupons.id'), nullable=True)
    remark = db.Column(db.String(255), nullable=True)
    payment_time = db.Column(db.DateTime, nullable=True)
    shipping_time = db.Column(db.DateTime, nullable=True)
    completion_time = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联关系
    items = db.relationship('OrderItem', backref='order', lazy='dynamic')
    address = db.relationship('Address', backref='orders')
    coupon = db.relationship('UserCoupon', backref='orders')

class OrderItem(db.Model):
    """
    订单项模型
    """
    __tablename__ = 'order_items'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    spec_id = db.Column(db.Integer, db.ForeignKey('product_specs.id'), nullable=True)
    product_name = db.Column(db.String(100), nullable=False)
    product_image = db.Column(db.String(255), nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, default=1)
    is_reviewed = db.Column(db.Boolean, default=False, comment='是否已评价')
    created_at = db.Column(db.DateTime, default=datetime.now)

class Coupon(db.Model):
    """
    优惠券模型
    """
    __tablename__ = 'coupons'
    
    id = db.Column(db.Integer, primary_key=True)
    merchant_id = db.Column(db.Integer, db.ForeignKey('merchant_info.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    amount = db.Column(db.Float, nullable=False)
    min_spend = db.Column(db.Float, default=0)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    coupon_code = db.Column(db.String(20), nullable=True)
    quantity = db.Column(db.Integer, default=-1)  # -1表示无限制
    used_count = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    category_id = db.Column(db.Integer, db.ForeignKey('product_category.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联关系
    user_coupons = db.relationship('UserCoupon', backref='coupon', lazy='dynamic')
    category = db.relationship('ProductCategory', backref='coupons')

class UserCoupon(db.Model):
    """
    用户优惠券模型
    """
    __tablename__ = 'user_coupons'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    coupon_id = db.Column(db.Integer, db.ForeignKey('coupons.id'), nullable=False)
    from_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, comment='优惠券分享来源用户ID')
    is_used = db.Column(db.Boolean, default=False)
    used_time = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    # 关联关系
    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('received_coupons', lazy='dynamic'))
    from_user = db.relationship('User', foreign_keys=[from_user_id], backref=db.backref('shared_coupons', lazy='dynamic'))

class Favorite(db.Model):
    """
    用户收藏模型
    """
    __tablename__ = 'favorites'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    # 关联关系
    user = db.relationship('User', backref=db.backref('favorites', lazy='dynamic'))
    product = db.relationship('Product', backref=db.backref('favorites', lazy='dynamic'))

class ProductCategory(db.Model):
    """商品分类表"""
    __tablename__ = 'product_category'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(50), nullable=False, unique=True, comment='分类名称')
    description = db.Column(db.String(255), comment='分类描述')
    parent_id = db.Column(db.Integer, db.ForeignKey('product_category.id'), comment='父分类ID')
    sort_order = db.Column(db.Integer, default=0, comment='排序')
    image_url = db.Column(db.String(255), comment='分类图片')
    is_active = db.Column(db.Boolean, default=True, comment='是否激活')
    created_at = db.Column(db.DateTime, default=datetime.now, comment='创建时间')
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, comment='更新时间')
    created_by = db.Column(db.Integer, comment='创建者')
    updated_by = db.Column(db.Integer, comment='更新者')
    
    # 关系定义
    children = db.relationship('ProductCategory', backref=db.backref('parent', remote_side=[id]), lazy='dynamic')
    products = db.relationship('Product', backref='product_category', lazy='dynamic', foreign_keys='Product.category_id')
    
    def __repr__(self):
        return f'<ProductCategory {self.name}>'

class ProductReview(db.Model):
    """
    商品评价模型
    """
    __tablename__ = 'product_reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, comment='评价用户ID')
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, comment='商品ID')
    order_item_id = db.Column(db.Integer, db.ForeignKey('order_items.id'), nullable=False, comment='订单项ID')
    rating = db.Column(db.Integer, nullable=False, default=5, comment='评分(1-5星)')
    content = db.Column(db.String(500), nullable=True, comment='评价内容')
    images = db.Column(db.JSON, nullable=True, comment='评价图片，JSON格式存储图片URL数组')
    is_anonymous = db.Column(db.Boolean, default=False, comment='是否匿名评价')
    status = db.Column(db.String(20), default='approved', comment='评价状态:pending/approved/rejected')
    created_at = db.Column(db.DateTime, default=datetime.now, comment='创建时间')
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, comment='更新时间')
    
    # 关联关系
    user = db.relationship('User', backref=db.backref('reviews', lazy='dynamic'))
    product = db.relationship('Product', backref=db.backref('reviews', lazy='dynamic'))
    order_item = db.relationship('OrderItem', backref=db.backref('review', uselist=False))
    
    def to_dict(self):
        """将评价转换为字典"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'product_id': self.product_id,
            'order_item_id': self.order_item_id,
            'rating': self.rating,
            'content': self.content,
            'images': self.images,
            'is_anonymous': self.is_anonymous,
            'status': self.status,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

# 创建数据库表
def init_db(app):
    with app.app_context():
        db.create_all() 