from flask import Flask
from models import db, User, MerchantInfo
from config import Config
import sys

def create_default_admin(app):
    """
    检查并创建默认管理员账号
    """
    with app.app_context():
        # 检查是否已存在管理员账号
        admin = User.query.filter_by(username='admin', is_merchant=True).first()
        
        if admin:
            print("管理员账号已存在，无需创建")
            return False
        
        # 创建新管理员账号
        print("正在创建默认管理员账号...")
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
            print("管理员账号创建成功！")
            print("用户名: admin")
            print("密码: admin123")
            print("请登录后立即修改默认密码！")
            return True
        except Exception as e:
            db.session.rollback()
            print(f"创建管理员账号失败: {str(e)}")
            return False

def main():
    # 创建Flask应用
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # 初始化数据库
    db.init_app(app)
    
    # 创建管理员账号
    success = create_default_admin(app)
    
    # 返回状态码
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main() 