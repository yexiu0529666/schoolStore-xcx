from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError
import shortuuid

from models import db, User, Address, Favorite, Product
from utils import success_response, error_response, validate_phone, validate_email
from utils import generate_verification_code, set_verification_code, get_verification_code
from utils import delete_verification_code, get_wechat_openid, user_required

user_bp = Blueprint('user', __name__)

@user_bp.route('/register', methods=['POST'])
def register():
    """
    用户注册
    """
    data = request.get_json()
    
    # 验证参数
    nickname = data.get('nickname')
    password = data.get('password')
    verify_code = data.get('verifyCode')
    
    if not nickname or not password:
        return error_response('昵称和密码不能为空')
    
    if len(password) < 6:
        return error_response('密码长度不能小于6个字符')
    
    # 手机号或邮箱注册
    phone = data.get('phone')
    email = data.get('email')
    
    if not phone and not email:
        return error_response('手机号或邮箱不能为空')
    
    if phone:
        if not validate_phone(phone):
            return error_response('手机号格式不正确')
        
        # 验证手机验证码
        stored_code = get_verification_code(f"phone:{phone}")
        if not stored_code or stored_code != verify_code:
            return error_response('验证码错误或已过期')
        
        # 检查手机号是否已被注册
        if User.query.filter_by(phone=phone).first():
            return error_response('该手机号已被注册')
    else:
        if not validate_email(email):
            return error_response('邮箱格式不正确')
        
        # 验证邮箱验证码
        stored_code = get_verification_code(f"email:{email}")
        if not stored_code or stored_code != verify_code:
            return error_response('验证码错误或已过期')
        
        # 检查邮箱是否已被注册
        if User.query.filter_by(email=email).first():
            return error_response('该邮箱已被注册')
    
    # 创建用户
    user = User(
        nickname=nickname,
        phone=phone,
        email=email,
        username=phone or email,
    )
    user.password = password
    
    try:
        db.session.add(user)
        db.session.commit()
        
        # 生成JWT令牌
        access_token = create_access_token(identity=user.id)
        
        # 删除验证码
        if phone:
            delete_verification_code(f"phone:{phone}")
        else:
            delete_verification_code(f"email:{email}")
        
        return success_response({
            'token': access_token,
            'userInfo': user.to_dict()
        }, '注册成功')
    except IntegrityError:
        db.session.rollback()
        return error_response('用户名已存在')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"用户注册异常: {str(e)}")
        return error_response('注册失败，请稍后再试')

@user_bp.route('/login', methods=['POST'])
def login():
    """
    用户登录
    """
    data = request.get_json()
    
    password = data.get('password')
    if not password:
        return error_response('密码不能为空')
    
    # 通过手机号或邮箱登录
    phone = data.get('phone')
    email = data.get('email')
    
    if not phone and not email:
        return error_response('请提供手机号或邮箱')
    
    # 查找用户
    if phone:
        user = User.query.filter_by(phone=phone).first()
    else:
        user = User.query.filter_by(email=email).first()
    
    if not user:
        return error_response('用户不存在')
    
    # 验证密码
    if not user.verify_password(password):
        return error_response('密码错误')
    
    # 生成JWT令牌
    access_token = create_access_token(identity=user.id)
    
    return success_response({
        'token': access_token,
        'userInfo': user.to_dict()
    }, '登录成功')

@user_bp.route('/wx-login', methods=['POST'])
def wx_login():
    """
    微信登录
    """
    data = request.get_json()
    code = data.get('code')
    
    if not code:
        return error_response('微信code不能为空')
    
    # 获取微信openid
    openid = get_wechat_openid(code)
    if not openid:
        return error_response('获取微信信息失败')
    
    # 查找或创建用户
    user = User.query.filter_by(openid=openid).first()
    
    if not user:
        # 创建新用户
        nickname = data.get('nickname', f'用户_{shortuuid.uuid()[:8]}')
        avatar = data.get('avatar')
        gender = data.get('gender')
        
        user = User(
            openid=openid,
            nickname=nickname,
            avatar=avatar,
            gender=gender,
            username=f'wx_{shortuuid.uuid()[:10]}'
        )
        user.password = shortuuid.uuid()  # 设置随机密码
        
        try:
            db.session.add(user)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"微信用户创建异常: {str(e)}")
            return error_response('用户创建失败，请稍后再试')
    
    # 生成JWT令牌
    access_token = create_access_token(identity=user.id)
    
    return success_response({
        'token': access_token,
        'userInfo': user.to_dict()
    }, '登录成功')

@user_bp.route('/send-verify-code', methods=['POST'])
def send_verify_code():
    """
    发送验证码
    """
    data = request.get_json()
    
    # 通过手机号或邮箱发送验证码
    phone = data.get('phone')
    
    if not phone :
        return error_response('请提供手机号')
    
    # 生成验证码
    code = generate_verification_code()
    
    # 模拟发送验证码
    if phone:
        if not validate_phone(phone):
            return error_response('手机号格式不正确')
        
        # TODO: 调用短信API发送验证码
        current_app.logger.info(f"发送验证码到手机 {phone}: {code}")
        
        # 存储验证码
        set_verification_code(f"phone:{phone}", code)
    
    return success_response(message='验证码已发送')

@user_bp.route('/info', methods=['GET'])
@user_required
def get_user_info():
    """
    获取用户信息
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    return success_response(user.to_dict())

@user_bp.route('/update', methods=['POST'])
@user_required
def update_user_info():
    """
    更新用户信息
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    data = request.get_json()
    
    # 更新昵称
    if 'nickname' in data:
        user.nickname = data['nickname']
    
    # 更新头像
    if 'avatar' in data:
        user.avatar = data['avatar']
    
    # 更新性别
    if 'gender' in data:
        user.gender = data['gender']
    
    try:
        db.session.commit()
        return success_response(user.to_dict(), '信息更新成功')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"用户信息更新异常: {str(e)}")
        return error_response('信息更新失败，请稍后再试')

@user_bp.route('/address/list', methods=['GET'])
@user_required
def get_address_list():
    """
    获取用户地址列表
    """
    user_id = get_jwt_identity()
    
    # 获取所有地址，默认地址排在前面
    addresses = Address.query.filter_by(user_id=user_id).order_by(Address.is_default.desc(), Address.id.desc()).all()
    
    address_list = []
    for address in addresses:
        address_list.append({
            'id': address.id,
            'name': address.name,
            'phone': address.phone,
            'province': address.province,
            'city': address.city,
            'district': address.district,
            'detail': address.detail,
            'is_default': address.is_default
        })
    
    return success_response(address_list)

@user_bp.route('/address/add', methods=['POST'])
@user_required
def add_address():
    """
    添加收货地址
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # 验证必要参数
    required_fields = ['name', 'phone', 'province', 'city', 'district', 'detail']
    for field in required_fields:
        if field not in data or not data[field]:
            return error_response(f'{field} 不能为空')
    
    # 验证手机号格式
    if not validate_phone(data['phone']):
        return error_response('手机号格式不正确')
    
    # 创建新地址
    address = Address(
        user_id=user_id,
        name=data['name'],
        phone=data['phone'],
        province=data['province'],
        city=data['city'],
        district=data['district'],
        detail=data['detail'],
        is_default=data.get('is_default', False)
    )
    
    # 如果设为默认地址，则取消其他默认地址
    if address.is_default:
        Address.query.filter_by(user_id=user_id, is_default=True).update({'is_default': False})
    
    try:
        db.session.add(address)
        db.session.commit()
        
        return success_response({
            'id': address.id,
            'name': address.name,
            'phone': address.phone,
            'province': address.province,
            'city': address.city,
            'district': address.district,
            'detail': address.detail,
            'is_default': address.is_default
        }, '添加成功')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"添加地址异常: {str(e)}")
        return error_response('添加失败，请稍后再试')

@user_bp.route('/address/update', methods=['POST'])
@user_required
def update_address():
    """
    更新收货地址
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # 验证必要参数
    if 'id' not in data:
        return error_response('地址ID不能为空')
    
    address_id = data['id']
    address = Address.query.filter_by(id=address_id, user_id=user_id).first()
    
    if not address:
        return error_response('地址不存在或没有权限')
    
    # 更新地址信息
    fields = ['name', 'phone', 'province', 'city', 'district', 'detail']
    for field in fields:
        if field in data and data[field]:
            setattr(address, field, data[field])
    
    # 处理默认地址
    if 'is_default' in data:
        # 如果设为默认地址，则取消其他默认地址
        if data['is_default'] and not address.is_default:
            Address.query.filter_by(user_id=user_id, is_default=True).update({'is_default': False})
        address.is_default = data['is_default']
    
    try:
        db.session.commit()
        
        return success_response({
            'id': address.id,
            'name': address.name,
            'phone': address.phone,
            'province': address.province,
            'city': address.city,
            'district': address.district,
            'detail': address.detail,
            'is_default': address.is_default
        }, '更新成功')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"更新地址异常: {str(e)}")
        return error_response('更新失败，请稍后再试')

@user_bp.route('/address/delete', methods=['POST'])
@user_required
def delete_address():
    """
    删除收货地址
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if 'id' not in data:
        return error_response('地址ID不能为空')
    
    address_id = data['id']
    address = Address.query.filter_by(id=address_id, user_id=user_id).first()
    
    if not address:
        return error_response('地址不存在或没有权限')
    
    try:
        db.session.delete(address)
        db.session.commit()
        
        return success_response(message='删除成功')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"删除地址异常: {str(e)}")
        return error_response('删除失败，请稍后再试')

@user_bp.route('/address/set-default', methods=['POST'])
@user_required
def set_default_address():
    """
    设置默认收货地址
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if 'id' not in data:
        return error_response('地址ID不能为空')
    
    address_id = data['id']
    address = Address.query.filter_by(id=address_id, user_id=user_id).first()
    
    if not address:
        return error_response('地址不存在或没有权限')
    
    try:
        # 取消原默认地址
        Address.query.filter_by(user_id=user_id, is_default=True).update({'is_default': False})
        
        # 设置新默认地址
        address.is_default = True
        db.session.commit()
        
        return success_response(message='设置成功')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"设置默认地址异常: {str(e)}")
        return error_response('设置失败，请稍后再试')

@user_bp.route('/address/detail/<int:address_id>', methods=['GET'])
@user_required
def get_address_detail(address_id):
    """
    获取地址详情
    """
    user_id = get_jwt_identity()
    
    address = Address.query.filter_by(id=address_id, user_id=user_id).first()
    
    if not address:
        return error_response('地址不存在或没有权限')
    
    return success_response({
        'id': address.id,
        'name': address.name,
        'phone': address.phone,
        'province': address.province,
        'city': address.city,
        'district': address.district,
        'detail': address.detail,
        'is_default': address.is_default
    })

@user_bp.route('/favorite/list', methods=['GET'])
@user_required
def get_favorite_list():
    """
    获取用户收藏列表
    """
    user_id = get_jwt_identity()
    
    # 联合查询收藏和商品信息
    favorites = db.session.query(Favorite, Product)\
        .join(Product, Favorite.product_id == Product.id)\
        .filter(Favorite.user_id == user_id)\
        .order_by(Favorite.created_at.desc())\
        .all()
    
    favorite_list = []
    for favorite, product in favorites:
        favorite_list.append({
            'id': favorite.id,
            'product': {
                'id': product.id,
                'name': product.name,
                'price': product.price,
                'original_price': product.original_price,
                'main_image': product.main_image,
                'sales': product.sales
            },
            'created_at': favorite.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    return success_response(favorite_list)

@user_bp.route('/favorite/add', methods=['POST'])
@user_required
def add_favorite():
    """
    添加收藏
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    product_id = data.get('product_id')
    if not product_id:
        return error_response('商品ID不能为空')
    
    # 检查商品是否存在
    product = Product.query.get(product_id)
    if not product:
        return error_response('商品不存在')
    
    # 检查是否已收藏
    existing = Favorite.query.filter_by(user_id=user_id, product_id=product_id).first()
    if existing:
        return error_response('该商品已收藏')
    
    # 创建收藏
    favorite = Favorite(
        user_id=user_id,
        product_id=product_id
    )
    
    try:
        db.session.add(favorite)
        db.session.commit()
        
        return success_response({
            'id': favorite.id,
            'product_id': product_id
        }, '收藏成功')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"添加收藏异常: {str(e)}")
        return error_response('收藏失败，请稍后再试')

@user_bp.route('/favorite/remove', methods=['POST'])
@user_required
def remove_favorite():
    """
    取消收藏
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    favorite_id = data.get('id')
    if not favorite_id:
        return error_response('收藏ID不能为空')
    
    favorite = Favorite.query.filter_by(id=favorite_id, user_id=user_id).first()
    if not favorite:
        return error_response('收藏不存在或没有权限')
    
    try:
        db.session.delete(favorite)
        db.session.commit()
        
        return success_response(message='取消收藏成功')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"取消收藏异常: {str(e)}")
        return error_response('取消收藏失败，请稍后再试')

@user_bp.route('/favorite/check', methods=['GET'])
@user_required
def check_favorite():
    """
    检查商品是否已收藏
    """
    user_id = get_jwt_identity()
    product_id = request.args.get('product_id')
    
    if not product_id:
        return error_response('商品ID不能为空')
    
    favorite = Favorite.query.filter_by(user_id=user_id, product_id=product_id).first()
    
    return success_response({
        'is_favorite': favorite is not None,
        'favorite_id': favorite.id if favorite else None
    })