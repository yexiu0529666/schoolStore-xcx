from flask import Blueprint, request, current_app
from flask_jwt_extended import get_jwt_identity
import datetime
import random
import string
import json

from models import db, User, Cart, CartItem, Product, ProductSpec, Order, OrderItem, Address, OrderStatus, UserCoupon
from utils import success_response, error_response, model_to_dict, user_required

order_bp = Blueprint('order', __name__)

def generate_order_no():
    """
    生成订单号
    """
    now = datetime.datetime.now()
    date_str = now.strftime('%Y%m%d%H%M%S')
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{date_str}{random_str}"

@order_bp.route('/create', methods=['POST'])
@user_required
def create_order():
    """
    创建订单
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    cart_item_ids = data.get('cart_item_ids', [])
    address_id = data.get('address_id')
    remark = data.get('remark', '')
    coupon_id = data.get('coupon_id')
    final_price = data.get('final_price')  # 获取实付款金额
    
    if not cart_item_ids:
        return error_response('请选择商品')
    
    if not address_id:
        return error_response('请选择收货地址')
    
    # 检查地址是否存在
    address = Address.query.filter_by(id=address_id, user_id=user_id).first()
    if not address:
        return error_response('收货地址不存在')
    
    # 获取购物车
    cart = Cart.query.filter_by(user_id=user_id).first()
    if not cart:
        return error_response('购物车为空')
    
    # 获取购物车项
    cart_items = CartItem.query.filter(
        CartItem.cart_id == cart.id,
        CartItem.id.in_(cart_item_ids)
    ).all()
    
    if not cart_items:
        return error_response('请选择有效商品')
    
    # 检查优惠券是否有效
    user_coupon = None
    if coupon_id:
        user_coupon = UserCoupon.query.filter_by(id=coupon_id, user_id=user_id, is_used=False).first()
        if not user_coupon:
            return error_response('优惠券无效或已使用')
        
        # 检查优惠券是否过期
        coupon = user_coupon.coupon
        if not coupon.is_active or coupon.end_date < datetime.datetime.now():
            return error_response('优惠券已过期')
    
    # 创建订单
    order = Order(
        order_no=generate_order_no(),
        user_id=user_id,
        status=OrderStatus.PENDING_PAYMENT,
        total_amount=0,
        payment_amount=final_price if final_price is not None else 0,  # 设置实付款金额
        address_id=address_id,
        remark=remark,
        coupon_id=coupon_id
    )
    
    db.session.add(order)
    
    # 创建订单项并计算总金额
    total_amount = 0
    order_items = []
    out_of_stock = []
    
    for cart_item in cart_items:
        product = Product.query.get(cart_item.product_id)
        
        if not product:
            return error_response(f'商品不存在: {cart_item.product_id}')
        
        if not product.is_on_sale:
            return error_response(f'商品已下架: {product.name}')
        
        # 商品规格
        spec = None
        price = product.price
        
        if cart_item.spec_id:
            spec = ProductSpec.query.get(cart_item.spec_id)
            if not spec:
                return error_response(f'商品规格不存在: {cart_item.spec_id}')
            
            price = spec.price
            
            # 检查库存
            if spec.stock < cart_item.quantity:
                out_of_stock.append(f'{product.name} ({spec.name})')
                continue
            
            # 减少库存
            spec.stock -= cart_item.quantity
        else:
            # 检查库存
            if product.stock < cart_item.quantity:
                out_of_stock.append(product.name)
                continue
            
            # 减少库存
            product.stock -= cart_item.quantity
        
        # 创建订单项
        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            product_name=product.name,
            product_image=product.main_image,
            price=price,
            quantity=cart_item.quantity,
            spec_id=cart_item.spec_id
        )
        
        order_items.append(order_item)
        total_amount += price * cart_item.quantity
    
    if out_of_stock:
        db.session.rollback()
        return error_response(f'以下商品库存不足: {", ".join(out_of_stock)}')
    
    if not order_items:
        db.session.rollback()
        return error_response('没有有效商品')
    
    # 更新订单总金额
    order.total_amount = total_amount
    
    # 保存订单项
    for order_item in order_items:
        db.session.add(order_item)
    
    # 从购物车中删除已下单商品
    for cart_item in cart_items:
        db.session.delete(cart_item)
    
    # 更新优惠券使用状态
    if user_coupon:
        user_coupon.is_used = True
        user_coupon.used_time = datetime.datetime.now()
        # 更新优惠券使用次数
        coupon = user_coupon.coupon
        coupon.used_count += 1
    
    try:
        db.session.commit()
        return success_response({
            'order_id': order.id,
            'order_no': order.order_no
        })
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"创建订单异常: {str(e)}")
        return error_response('创建订单失败，请稍后再试')

@order_bp.route('/create/direct', methods=['POST'])
@user_required
def create_direct_order():
    """
    直接购买创建订单
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    product_id = data.get('product_id')
    quantity = data.get('quantity', 1)
    spec_id = data.get('spec_id')
    address_id = data.get('address_id')
    remark = data.get('remark', '')
    coupon_id = data.get('coupon_id')
    final_price = data.get('final_price')  # 获取实付款金额
    
    if not product_id:
        return error_response('请选择商品')
    
    if not address_id:
        return error_response('请选择收货地址')
    
    # 检查地址是否存在
    address = Address.query.filter_by(id=address_id, user_id=user_id).first()
    if not address:
        return error_response('收货地址不存在')
    
    # 检查商品是否存在
    product = Product.query.get(product_id)
    if not product:
        return error_response('商品不存在')
    
    if not product.is_on_sale:
        return error_response(f'商品已下架: {product.name}')
    
    # 商品规格和价格
    spec = None
    price = product.price
    
    if spec_id:
        spec = ProductSpec.query.get(spec_id)
        if not spec:
            return error_response('商品规格不存在')
        
        price = spec.price
        
        # 检查库存
        if spec.stock < quantity:
            return error_response(f'商品库存不足: {product.name} ({spec.name})')
        
        # 减少库存
        spec.stock -= quantity

    # 检查库存
    if product.stock < quantity:
        return error_response(f'商品库存不足: {product.name}')

    # 减少库存
    product.stock -= quantity

    
    # 检查优惠券是否有效
    user_coupon = None
    if coupon_id:
        user_coupon = UserCoupon.query.filter_by(id=coupon_id, user_id=user_id, is_used=False).first()
        if not user_coupon:
            return error_response('优惠券无效或已使用')
        
        # 检查优惠券是否过期
        coupon = user_coupon.coupon
        if not coupon.is_active or coupon.end_date < datetime.datetime.now():
            return error_response('优惠券已过期')
    
    # 创建订单
    total_amount = price * quantity
    
    order = Order(
        order_no=generate_order_no(),
        user_id=user_id,
        status=OrderStatus.PENDING_PAYMENT,
        total_amount=total_amount,
        payment_amount=final_price if final_price is not None else total_amount,  # 设置实付款金额
        address_id=address_id,
        remark=remark,
        coupon_id=coupon_id
    )
    
    db.session.add(order)
    db.session.flush()  # 获取订单ID
    
    # 创建订单项
    order_item = OrderItem(
        order_id=order.id,
        product_id=product.id,
        product_name=product.name,
        product_image=product.main_image,
        price=price,
        quantity=quantity,
        spec_id=spec_id
    )
    
    db.session.add(order_item)
    
    # 更新优惠券使用状态
    if user_coupon:
        user_coupon.is_used = True
        user_coupon.used_time = datetime.datetime.now()
        # 更新优惠券使用次数
        coupon = user_coupon.coupon
        coupon.used_count += 1
    
    try:
        db.session.commit()
        return success_response({
            'order_id': order.id,
            'order_no': order.order_no
        })
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"创建直接购买订单异常: {str(e)}")
        return error_response('创建订单失败，请稍后再试')

@order_bp.route('/list', methods=['GET'])
@user_required
def get_order_list():
    """
    获取订单列表
    """
    user_id = get_jwt_identity()
    status = request.args.get('status')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    
    # 构建查询
    query = Order.query.filter_by(user_id=user_id)
    
    if status and status != 'all':
        # 处理数组格式的状态
        try:
            # 尝试解析JSON字符串
            if status.startswith('[') and status.endswith(']'):
                status_list = json.loads(status)
                query = query.filter(Order.status.in_(status_list))
            # 处理逗号分隔的字符串
            elif isinstance(status, str) and ',' in status:
                status_list = status.split(',')
                query = query.filter(Order.status.in_(status_list))
            else:
                query = query.filter_by(status=status)
        except Exception as e:
            current_app.logger.error(f"解析status参数异常: {str(e)}")
            query = query.filter_by(status=status)
    
    # 分页
    total = query.count()
    orders = query.order_by(Order.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    order_list = []
    
    for order in orders:
        # 获取订单项
        items = OrderItem.query.filter_by(order_id=order.id).all()
        
        # 获取地址信息
        address = Address.query.get(order.address_id)
        address_info = None
        if address:
            address_info = {
                'name': address.name,
                'phone': address.phone,
                'province': address.province,
                'city': address.city,
                'district': address.district,
                'detail': address.detail
            }
        
        order_data = {
            'id': order.id,
            'order_no': order.order_no,
            'status': order.status.value,  # 使用枚举值
            'total_amount': order.total_amount,
            'payment_amount': order.payment_amount,
            'create_time': order.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'payment_time': order.payment_time.strftime('%Y-%m-%d %H:%M:%S') if order.payment_time else None,
            'shipping_time': order.shipping_time.strftime('%Y-%m-%d %H:%M:%S') if order.shipping_time else None,
            'completion_time': order.completion_time.strftime('%Y-%m-%d %H:%M:%S') if order.completion_time else None,
            'address_info': address_info,
            'remark': order.remark,
            'items': [
                {
                    'id': item.id,
                    'product_id': item.product_id,
                    'product_name': item.product_name,
                    'product_image': item.product_image,
                    'price': item.price,
                    'quantity': item.quantity,
                    'spec_id': item.spec_id,
                    'is_reviewed': item.is_reviewed
                }
                for item in items
            ]
        }
        
        order_list.append(order_data)
    
    return success_response({
        'total': total,
        'list': order_list,
        'page': page,
        'limit': limit
    })

@order_bp.route('/detail/<int:order_id>', methods=['GET'])
@user_required
def get_order_detail(order_id):
    """
    获取订单详情
    """
    user_id = get_jwt_identity()
    
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    
    if not order:
        return error_response('订单不存在')
    
    # 获取订单项
    items = OrderItem.query.filter_by(order_id=order.id).all()
    
    # 获取地址信息
    address = Address.query.get(order.address_id)
    address_info = None
    if address:
        address_info = {
            'name': address.name,
            'phone': address.phone,
            'province': address.province,
            'city': address.city,
            'district': address.district,
            'detail': address.detail
        }
    
    order_data = {
        'id': order.id,
        'order_no': order.order_no,
        'status': order.status.value,
        'total_amount': order.total_amount,
        'payment_amount': order.payment_amount,
        'create_time': order.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        'payment_time': order.payment_time.strftime('%Y-%m-%d %H:%M:%S') if order.payment_time else None,
        'shipping_time': order.shipping_time.strftime('%Y-%m-%d %H:%M:%S') if order.shipping_time else None,
        'completion_time': order.completion_time.strftime('%Y-%m-%d %H:%M:%S') if order.completion_time else None,
        'address_info': address_info,
        'remark': order.remark,
        'items': [
            {
                'id': item.id,
                'product_id': item.product_id,
                'product_name': item.product_name,
                'product_image': item.product_image,
                'price': item.price,
                'quantity': item.quantity,
                'spec_id': item.spec_id,
                'is_reviewed': item.is_reviewed
            }
            for item in items
        ]
    }
    
    return success_response(order_data)

@order_bp.route('/cancel/<int:order_id>', methods=['POST'])
@user_required
def cancel_order(order_id):
    """
    取消订单
    """
    user_id = get_jwt_identity()
    
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    
    if not order:
        return error_response('订单不存在')
    
    if order.status != OrderStatus.PENDING_PAYMENT:
        return error_response('只有待支付的订单可以取消')
    
    # 更新订单状态
    order.status = OrderStatus.CANCELLED
    
    # 恢复库存
    order_items = OrderItem.query.filter_by(order_id=order.id).all()
    
    for item in order_items:
        product = Product.query.get(item.product_id)
        
        if not product:
            continue
        
        if item.spec_id:
            spec = ProductSpec.query.get(item.spec_id)
            if spec:
                spec.stock += item.quantity

        product.stock += item.quantity

    
    # 恢复优惠券状态
    if order.coupon_id:
        user_coupon = UserCoupon.query.get(order.coupon_id)
        if user_coupon and user_coupon.is_used:
            user_coupon.is_used = False
            user_coupon.used_time = None
            
            # 减少优惠券使用次数
            coupon = user_coupon.coupon
            if coupon.used_count > 0:
                coupon.used_count -= 1
    
    try:
        db.session.commit()
        return success_response(message='订单已取消')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"取消订单异常: {str(e)}")
        return error_response('取消订单失败，请稍后再试')

@order_bp.route('/pay/<int:order_id>', methods=['POST'])
@user_required
def pay_order(order_id):
    """
    支付订单（模拟支付）
    """
    user_id = get_jwt_identity()
    
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    
    if not order:
        return error_response('订单不存在')
    
    if order.status != OrderStatus.PENDING_PAYMENT:
        return error_response('订单状态不正确')
    
    # 更新订单状态
    order.status = OrderStatus.PENDING_SHIPMENT
    order.payment_time = datetime.datetime.now()
    
    # 如果payment_amount为0，设置为total_amount
    if order.payment_amount == 0:
        order.payment_amount = order.total_amount
    
    try:
        db.session.commit()
        return success_response(message='订单支付成功')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"支付订单异常: {str(e)}")
        return error_response('支付订单失败，请稍后再试')

@order_bp.route('/confirm/<int:order_id>', methods=['POST'])
@user_required
def confirm_order(order_id):
    """
    确认收货
    """
    user_id = get_jwt_identity()
    
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    order_item = OrderItem.query.filter_by(order_id=order.id).first()
    product = Product.query.filter(Product.id == order_item.product_id).first()
    product.sales += order_item.quantity

    if not order:
        return error_response('订单不存在')
    
    if order.status != OrderStatus.PENDING_RECEIPT:
        return error_response('只有已发货的订单可以确认收货')
    
    # 更新订单状态
    order.status = OrderStatus.COMPLETED
    order.completion_time = datetime.datetime.now()
    
    try:
        db.session.commit()
        return success_response(message='已确认收货')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"确认收货异常: {str(e)}")
        return error_response('确认收货失败，请稍后再试')

@order_bp.route('/refund/apply/<int:order_id>', methods=['POST'])
@user_required
def apply_refund(order_id):
    """
    用户申请退款
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    refund_reason = data.get('refund_reason', '')
    
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    
    if not order:
        return error_response('订单不存在')
    
    # 检查订单状态，只有已支付的订单可以申请退款
    if order.status not in [OrderStatus.PENDING_SHIPMENT, OrderStatus.PENDING_RECEIPT]:
        return error_response('当前订单状态不支持申请退款')
    
    # 更新订单状态为退款中
    order.status = OrderStatus.REFUNDING
    # 记录退款原因
    order.remark = f"退款原因: {refund_reason}" if not order.remark else f"{order.remark}\n退款原因: {refund_reason}"
    
    try:
        db.session.commit()
        return success_response(message='退款申请已提交，等待商家确认')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"申请退款异常: {str(e)}")
        return error_response('申请退款失败，请稍后再试')

@order_bp.route('/refund/confirm/<int:order_id>', methods=['POST'])
@user_required
def confirm_refund(order_id):
    """
    商家确认退款
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    action = data.get('action', 'confirm')  # confirm或reject
    merchant_remark = data.get('remark', '')
    
    # 获取当前用户信息
    user = User.query.get(user_id)
    if not user or not user.is_merchant:
        return error_response('只有商家可以执行此操作')
    
    # 获取订单信息
    order = Order.query.get(order_id)
    if not order:
        return error_response('订单不存在')
    
    # 获取订单对应的商品所属商家
    order_item = OrderItem.query.filter_by(order_id=order.id).first()
    if not order_item:
        return error_response('订单商品不存在')
    
    product = Product.query.get(order_item.product_id)
    if not product:
        return error_response('商品不存在')
    
    # 验证当前商家是否有权限处理该订单
    merchant_info = user.merchant_info
    if not merchant_info or merchant_info.id != product.merchant_id:
        return error_response('您没有权限处理此订单')
    
    # 检查订单状态
    if order.status != OrderStatus.REFUNDING:
        return error_response('只有退款中的订单可以确认退款')
    
    if action == 'confirm':
        # 确认退款
        # 1. 更新订单状态
        order.status = OrderStatus.REFUNDED
        # 2. 添加商家备注
        if merchant_remark:
            order.remark = f"{order.remark}\n商家退款确认: {merchant_remark}" if order.remark else f"商家退款确认: {merchant_remark}"
        
        # 3. 恢复库存
        order_items = OrderItem.query.filter_by(order_id=order.id).all()
        for item in order_items:
            product = Product.query.get(item.product_id)
            if not product:
                continue
            
            # 恢复库存
            if item.spec_id:
                spec = ProductSpec.query.get(item.spec_id)
                if spec:
                    spec.stock += item.quantity
            else:
                product.stock += item.quantity
            
            # 减少销量
            if product.sales >= item.quantity:
                product.sales -= item.quantity
        
        # 4. 恢复优惠券状态
        if order.coupon_id:
            user_coupon = UserCoupon.query.get(order.coupon_id)
            if user_coupon and user_coupon.is_used:
                user_coupon.is_used = False
                user_coupon.used_time = None
                
                # 减少优惠券使用次数
                coupon = user_coupon.coupon
                if coupon.used_count > 0:
                    coupon.used_count -= 1
        
        message = '退款已确认'
    else:
        # 拒绝退款，将订单状态恢复为原状态（待发货或待收货）
        if order.shipping_time:
            order.status = OrderStatus.PENDING_RECEIPT  # 已发货，状态为待收货
        else:
            order.status = OrderStatus.PENDING_SHIPMENT  # 未发货，状态为待发货
        
        # 添加商家备注
        if merchant_remark:
            order.remark = f"{order.remark}\n商家拒绝退款: {merchant_remark}" if order.remark else f"商家拒绝退款: {merchant_remark}"
        
        message = '已拒绝退款申请'
    
    try:
        db.session.commit()
        return success_response(message=message)
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"处理退款异常: {str(e)}")
        return error_response('处理退款失败，请稍后再试') 