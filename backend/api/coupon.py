from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import os
import qrcode
import shortuuid
from PIL import Image, ImageDraw, ImageFont
import base64
import io

from models import db, Coupon, UserCoupon, User
from utils import success_response, error_response, user_required, merchant_required

coupon_bp = Blueprint('coupon', __name__)

@coupon_bp.route('/list', methods=['GET'])
@user_required
def get_coupon_list():
    """
    获取可用优惠券列表
    """
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        status = request.args.get('status', '')
        
        # 获取当前用户ID
        user_id = get_jwt_identity()
        
        # 获取用户已领取的优惠券ID列表
        received_coupon_ids = []
        if user_id:
            user_coupons = UserCoupon.query.filter_by(user_id=user_id).with_entities(UserCoupon.coupon_id).all()
            received_coupon_ids = [uc.coupon_id for uc in user_coupons]
        
        # 获取所有有效的优惠券
        query = Coupon.query.filter(
            Coupon.is_active == True,
            Coupon.end_date >= datetime.now()
        )
        
        if status == 'available':
            query = query.filter(Coupon.id.notin_(received_coupon_ids))
    
        # 分页
        total = query.count()
        coupons = query.order_by(Coupon.created_at.desc())\
            .offset((page - 1) * limit)\
            .limit(limit)\
            .all()
        
        # 格式化返回数据
        coupons_data = [{
            'id': coupon.id,
            'title': coupon.title,
            'amount': float(coupon.amount),
            'min_spend': float(coupon.min_spend),
            'description': coupon.description,
            'start_date': coupon.start_date.strftime('%Y-%m-%d %H:%M:%S'),
            'end_date': coupon.end_date.strftime('%Y-%m-%d %H:%M:%S'),
            'coupon_code': coupon.coupon_code,
            'is_active': coupon.is_active,
            'quantity': coupon.quantity,
            'used_count': coupon.used_count,
            'is_received': coupon.id in received_coupon_ids,  # 添加是否已领取标识
            'category_id': coupon.category_id,
            'category_name': coupon.category.name if coupon.category else None
        } for coupon in coupons]
        
        return success_response({
            'total': total,
            'list': coupons_data,
            'page': page,
            'limit': limit
        })
        
    except Exception as e:
        return error_response(str(e))

@coupon_bp.route('/user', methods=['GET'])
@user_required
def get_user_coupons():
    """
    获取用户优惠券列表
    """
    user_id = get_jwt_identity()
    status = request.args.get('status', '')  # 状态: 空=全部, unused=未使用, used=已使用, expired=已过期
    
    # 构建查询
    base_query = db.session.query(UserCoupon, Coupon)\
        .join(Coupon, UserCoupon.coupon_id == Coupon.id)\
        .filter(UserCoupon.user_id == user_id)
    
    # 根据状态筛选
    if status == 'unused':
        query = base_query.filter(
            UserCoupon.is_used == False,
            Coupon.end_date >= datetime.now()
        )
    elif status == 'used':
        query = base_query.filter(UserCoupon.is_used == True)
    elif status == 'expired':
        query = base_query.filter(
            UserCoupon.is_used == False,
            Coupon.end_date < datetime.now()
        )
    else:
        query = base_query
    
    # 获取结果
    user_coupons = query.all()
    
    result = []
    
    for user_coupon, coupon in user_coupons:
        result.append({
            'id': user_coupon.id,
            'coupon_id': coupon.id,
            'title': coupon.title,
            'description': coupon.description,
            'amount': coupon.amount,
            'min_spend': coupon.min_spend,
            'start_date': coupon.start_date.strftime('%Y-%m-%d %H:%M:%S'),
            'end_date': coupon.end_date.strftime('%Y-%m-%d %H:%M:%S'),
            'is_used': user_coupon.is_used,
            'used_time': user_coupon.used_time.strftime('%Y-%m-%d %H:%M:%S') if user_coupon.used_time else None,
            'is_expired': coupon.end_date < datetime.now(),
            'created_at': user_coupon.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'category_id': coupon.category_id,
            'category_name': coupon.category.name if coupon.category else None
        })
    
    return success_response(result)

@coupon_bp.route('/receive', methods=['POST'])
@user_required
def receive_coupon():
    """
    领取优惠券
    """
    user_id = get_jwt_identity()
    coupon_id = request.get_json().get('id')
    # 查找优惠券
    coupon = Coupon.query.get(coupon_id)
    
    if not coupon:
        return error_response('优惠券不存在')
    
    # 检查优惠券是否有效
    if not coupon.is_active:
        return error_response('优惠券已失效')
    
    # 检查是否过期
    if coupon.end_date < datetime.now():
        return error_response('优惠券已过期')
    
    # 检查数量限制
    if coupon.quantity != -1 and coupon.used_count >= coupon.quantity:
        return error_response('优惠券已领完')
    
    # 检查是否已经领取过
    exist_user_coupon = UserCoupon.query.filter_by(
        user_id=user_id, 
        coupon_id=coupon_id
    ).first()
    
    if exist_user_coupon:
        return error_response('您已领取过该优惠券')
    
    # 创建用户优惠券
    user_coupon = UserCoupon(
        user_id=user_id,
        coupon_id=coupon_id
    )
    
    # 增加使用计数
    coupon.used_count += 1
    
    try:
        db.session.add(user_coupon)
        db.session.commit()
        return success_response(message='领取成功')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"领取优惠券异常: {str(e)}")
        return error_response('领取失败，请稍后再试')

@coupon_bp.route('/share', methods=['POST'])
@user_required
def share_coupon():
    """
    生成优惠券分享二维码
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        coupon_id = data.get('coupon_id')

        if not coupon_id:
            return error_response('优惠券ID不能为空')

        # 验证优惠券是否存在
        coupon = Coupon.query.get(coupon_id)
        if not coupon:
            return error_response('优惠券不存在')

        # 验证优惠券是否有效
        if not coupon.is_active or coupon.end_date < datetime.now():
            return error_response('优惠券已过期或失效')

        # 获取当前用户信息
        user = User.query.get(user_id)

        # 生成分享参数 (用于小程序扫码后识别)
        share_id = f"coupon_{coupon_id}_{shortuuid.uuid()}"

        # 二维码内容 (包含优惠券ID和分享者ID)
        qr_content = {
            "type": "coupon",
            "coupon_id": coupon_id,
            "share_user_id": user_id,
            "share_id": share_id
        }

        # 将内容转为字符串
        content_str = f"https://your-domain.com/share?data={base64.urlsafe_b64encode(str(qr_content).encode()).decode()}"

        # 生成二维码
        qr = qrcode.QRCode(
            version=2,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=2,
        )
        qr.add_data(content_str)
        qr.make(fit=True)

        # 创建二维码图片
        qr_img = qr.make_image(fill_color="black", back_color="white")

        # 创建一个正方形背景以确保二维码完整显示
        qr_size = qr_img.size[0]  # 二维码的宽度

        # 确保二维码填满大部分区域，留出边距
        background_width = 600
        background_height = 800

        # 创建背景
        background = Image.new('RGB', (background_width, background_height), color=(255, 255, 255))

        # 计算二维码在背景中的位置 (居中放置)
        qr_x = (background_width - qr_size) // 2
        qr_y = 200  # 距离顶部留出足够空间放标题

        # 将二维码粘贴到背景上
        background.paste(qr_img, (qr_x, qr_y))

        # 添加优惠券信息
        draw = ImageDraw.Draw(background)

        try:
            # 尝试加载系统默认字体
            font_path = None

            # 检测操作系统并使用对应的默认字体
            import platform
            system = platform.system()

            if system == 'Windows':
                font_path = 'C:\\Windows\\Fonts\\simhei.ttf'  # Windows 默认黑体
            elif system == 'Darwin':  # macOS
                font_path = '/System/Library/Fonts/PingFang.ttc'
            else:  # Linux/其他
                font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

            # 标题字体和文本字体
            title_font = ImageFont.truetype(font_path, 30) if font_path else None
            text_font = ImageFont.truetype(font_path, 24) if font_path else None

            # 标题信息
            title_text = f"{coupon.title} - ¥{coupon.amount}"
            draw.text((background_width//2, 100), title_text,
                      fill=(0, 0, 0), anchor='mm', font=title_font)

            # 底部信息
            y_offset = qr_y + qr_size + 50

            # 描述信息
            desc_text = f"满{coupon.min_spend}元可用"
            draw.text((background_width//2, y_offset), desc_text,
                     fill=(0, 0, 0), anchor='mm', font=text_font)

            # 有效期信息
            valid_text = f"有效期至: {coupon.end_date.strftime('%Y-%m-%d')}"
            draw.text((background_width//2, y_offset + 45), valid_text,
                     fill=(0, 0, 0), anchor='mm', font=text_font)

            # 分享者信息
            if user:
                share_text = f"来自 {user.nickname or user.username or '好友'} 的分享"
                draw.text((background_width//2, y_offset + 90), share_text,
                         fill=(100, 100, 100), anchor='mm', font=text_font)

        except Exception as e:
            current_app.logger.error(f"处理字体和文字时出错: {str(e)}")
            # 如果字体加载失败，继续生成没有文字的二维码

        # 保存图片
        qr_filename = f"coupon_{coupon_id}_{share_id}.png"
        qr_path = os.path.join(current_app.static_folder, 'uploads', 'qrcodes', qr_filename)

        # 确保目录存在
        os.makedirs(os.path.dirname(qr_path), exist_ok=True)

        # 保存为高质量图片
        background.save(qr_path, quality=95)

        # 构建图片URL
        host = request.host_url.rstrip('/')
        qr_url = f"{host}/static/uploads/qrcodes/{qr_filename}"

        return success_response({
            'qrcode_url': qr_url,
            'share_id': share_id
        })

    except Exception as e:
        current_app.logger.error(f"生成分享二维码异常: {str(e)}")
        return error_response(f"生成二维码失败: {str(e)}")

# 接收分享优惠券的接口
@coupon_bp.route('/receive-shared', methods=['POST'])
@user_required
def receive_shared_coupon():
    """
    接收分享的优惠券
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        coupon_id = data.get('coupon_id')
        share_user_id = data.get('share_user_id')

        if not coupon_id:
            return error_response('优惠券ID不能为空')

        # 验证优惠券
        coupon = Coupon.query.get(coupon_id)
        if not coupon:
            return error_response('优惠券不存在')

        # 检查优惠券是否有效
        if not coupon.is_active:
            return error_response('优惠券已失效')

        # 检查是否过期
        if coupon.end_date < datetime.now():
            return error_response('优惠券已过期')

        # 检查数量限制
        if coupon.quantity != -1 and coupon.used_count >= coupon.quantity:
            return error_response('优惠券已领完')

        # 检查是否已经领取过
        exist_user_coupon = UserCoupon.query.filter_by(
            user_id=user_id,
            coupon_id=coupon_id
        ).first()

        if exist_user_coupon:
            return error_response('您已领取过该优惠券')

        # 创建用户优惠券
        user_coupon = UserCoupon(
            user_id=user_id,
            coupon_id=coupon_id,
            from_user_id=share_user_id if share_user_id else None
        )

        # 增加使用计数
        coupon.used_count += 1

        try:
            db.session.add(user_coupon)
            db.session.commit()
            return success_response(message='领取成功')
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"领取分享优惠券异常: {str(e)}")
            return error_response('领取失败，请稍后再试')

    except Exception as e:
        current_app.logger.error(f"接收分享优惠券异常: {str(e)}")
        return error_response(f"接收失败: {str(e)}")