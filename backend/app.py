from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

from config import Config
from models import db, User, MerchantInfo

# 加载环境变量
load_dotenv()

def ensure_admin_exists(app):
    """
    确保管理员账号存在
    """
    with app.app_context():
        # 检查是否已存在管理员账号
        admin = User.query.filter_by(username='admin', is_merchant=True).first()
        
        if admin:
            print("管理员账号已存在")
            return
        
        # 创建新管理员账号
        print("创建默认管理员账号...")
        admin = User(
            username='admin',
            phone='13800138000',
            email='admin@example.com',
            nickname='系统管理员',
            is_merchant=True
        )
        admin.password = 'admin123'  # 设置默认密码
        
        # 创建商家信息
        merchant_info = MerchantInfo(
            shop_name='校园迷你商城官方店',
            shop_logo='/static/images/logo.png',
            shop_desc='校园迷你商城官方店，提供优质商品和服务',
            contact_phone='13800138000',
            contact_email='admin@example.com'
        )
        
        admin.merchant_info = merchant_info
        
        try:
            db.session.add(admin)
            db.session.commit()
            print("管理员账号创建成功!")
            print("用户名: admin")
            print("密码: admin123")
            print("请登录后立即修改默认密码!")
        except Exception as e:
            db.session.rollback()
            print(f"创建管理员账号失败: {str(e)}")

def create_app(config_class=Config):
    """
    创建并配置Flask应用
    """
    # 明确指定static文件夹路径
    static_folder = os.path.join(os.getcwd(), 'static')
    app = Flask(__name__, 
                static_folder=static_folder, 
                static_url_path='/static')
    app.config.from_object(config_class)
    
    # 初始化数据库
    db.init_app(app)
    
    # 初始化Redis (现在是内存模式，但保留接口)
    from utils import init_redis
    init_redis(app)
    
    # 配置跨域
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # 配置JWT
    jwt = JWTManager(app)
    
    # 导入API模块
    from api.user import user_bp
    from api.admin import admin_bp
    from api.product import product_bp
    from api.cart import cart_bp
    from api.order import order_bp
    from api.coupon import coupon_bp
    from api.merchant import merchant_bp
    from api.merchant_category import merchant_category_bp
    from api.review import review_bp  # 导入评论模块
    
    # 如果有upload模块
    try:
        from api.upload import upload_bp
    except ImportError:
        upload_bp = None
    
    # 注册蓝图
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(product_bp, url_prefix='/api/product')
    app.register_blueprint(cart_bp, url_prefix='/api/cart')
    app.register_blueprint(order_bp, url_prefix='/api/order')
    app.register_blueprint(coupon_bp, url_prefix='/api/coupon')
    app.register_blueprint(merchant_bp, url_prefix='/api/merchant')
    app.register_blueprint(merchant_category_bp, url_prefix='/api/merchant/category')
    app.register_blueprint(review_bp, url_prefix='/api/review')  # 注册评论蓝图
    
    if upload_bp:
        app.register_blueprint(upload_bp, url_prefix='/api/upload')
    
    # 错误处理
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'message': '请求的资源不存在',
            'error': 'not_found'
        }), 404
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'success': False,
            'message': '请求参数错误',
            'error': 'bad_request'
        }), 400
    
    @app.errorhandler(500)
    def internal_server_error(error):
        return jsonify({
            'success': False,
            'message': '服务器内部错误',
            'error': 'internal_server_error'
        }), 500
    
    # 创建所有数据库表
    with app.app_context():
        db.create_all()
        # 确保管理员账号存在
        ensure_admin_exists(app)
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True) 