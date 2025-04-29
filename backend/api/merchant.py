from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
import random
import string

from models import db, User, MerchantInfo, Product, Order, OrderItem, Coupon, ProductImage, Favorite, UserCoupon, ProductSpec
from utils import success_response, error_response, merchant_required, model_to_dict

merchant_bp = Blueprint('merchant', __name__)

def get_merchant_id():
    """
    辅助函数，获取当前商家ID
    """
    user_id = get_jwt_identity()
    merchant_info = MerchantInfo.query.filter_by(user_id=user_id).first()
    
    if not merchant_info:
        return None
    
    return merchant_info.id

@merchant_bp.route('/info', methods=['GET'])
@merchant_required
def get_merchant_info():
    """
    获取商家信息
    """
    user_id = get_jwt_identity()
    
    # 查找用户和商家信息
    user = User.query.filter_by(id=user_id, is_merchant=True).first()
    merchant_info = MerchantInfo.query.filter_by(user_id=user_id).first()
    
    if not user or not merchant_info:
        return error_response('商家信息不存在')
    
    # 构建商家信息
    result = {
        'id': merchant_info.id,
        'user_id': user.id,
        'shop_name': merchant_info.shop_name,
        'shop_logo': merchant_info.shop_logo,
        'shop_banner': merchant_info.shop_banner,
        'shop_desc': merchant_info.shop_desc,
        'contact_phone': merchant_info.contact_phone,
        'contact_email': merchant_info.contact_email,
        'created_at': merchant_info.created_at.strftime('%Y-%m-%d %H:%M:%S')
    }
    
    return success_response(result)

@merchant_bp.route('/update', methods=['POST'])
@merchant_required
def update_merchant_info():
    """
    更新商家信息
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # 查找商家信息
    merchant_info = MerchantInfo.query.filter_by(user_id=user_id).first()
    
    if not merchant_info:
        return error_response('商家信息不存在')
    
    # 更新商家信息
    if 'shop_name' in data:
        merchant_info.shop_name = data['shop_name']
    
    if 'shop_logo' in data:
        merchant_info.shop_logo = data['shop_logo']
    
    if 'shop_banner' in data:
        merchant_info.shop_banner = data['shop_banner']
    
    if 'shop_desc' in data:
        merchant_info.shop_desc = data['shop_desc']
    
    if 'contact_phone' in data:
        merchant_info.contact_phone = data['contact_phone']
    
    if 'contact_email' in data:
        merchant_info.contact_email = data['contact_email']
    
    try:
        db.session.commit()
        return success_response(message='商家信息更新成功')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"商家信息更新异常: {str(e)}")
        return error_response('商家信息更新失败，请稍后再试')

@merchant_bp.route('/stats', methods=['GET'])
@merchant_required
def get_merchant_stats():
    """
    获取商家统计数据
    """
    user_id = get_jwt_identity()
    period = request.args.get('period', 'week')  # week, month, day, all
    
    # 查找商家信息
    merchant_info = MerchantInfo.query.filter_by(user_id=user_id).first()
    
    if not merchant_info:
        return error_response('商家信息不存在')
    
    merchant_id = merchant_info.id
    
    # 统计数据
    total_products = Product.query.filter_by(merchant_id=merchant_id).count()
    on_sale_products = Product.query.filter_by(merchant_id=merchant_id, is_on_sale=True).count()
    
    # 获取所有订单项中包含该商家商品的订单ID
    order_ids_query = db.session.query(OrderItem.order_id)\
        .join(Product, OrderItem.product_id == Product.id)\
        .filter(Product.merchant_id == merchant_id)
    
    # 根据时间段过滤订单
    now = datetime.now()
    if period == 'day':
        start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
        order_ids_query = order_ids_query.join(Order, OrderItem.order_id == Order.id)\
            .filter(Order.created_at >= start_time)
    elif period == 'week':
        start_time = now - timedelta(days=now.weekday())
        start_time = start_time.replace(hour=0, minute=0, second=0, microsecond=0)
        order_ids_query = order_ids_query.join(Order, OrderItem.order_id == Order.id)\
            .filter(Order.created_at >= start_time)
    elif period == 'month':
        start_time = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        order_ids_query = order_ids_query.join(Order, OrderItem.order_id == Order.id)\
            .filter(Order.created_at >= start_time)
    # 'all' 不进行时间过滤
    
    order_ids = order_ids_query.distinct().all()
    order_ids = [id[0] for id in order_ids]
    
    # 根据订单ID获取订单
    orders = Order.query.filter(Order.id.in_(order_ids)).all() if order_ids else []
    
    total_orders = len(orders)
    total_sales = sum(order.payment_amount for order in orders)
    
    # 计算客户数量(不同的用户ID数量)
    customer_ids = set()
    for order in orders:
        customer_ids.add(order.user_id)
    
    total_customers = len(customer_ids)
    
    # 获取不同订单状态的数量
    orders_by_status = {
        'pending_payment': 0,
        'pending_shipment': 0,
        'pending_receipt': 0,
        'completed': 0
    }
    
    for order in orders:
        status = order.status.value if hasattr(order.status, 'value') else order.status
        if status in orders_by_status:
            orders_by_status[status] += 1
    
    # 计算平均订单金额
    average_order_value = round(total_sales / total_orders, 2) if total_orders > 0 else 0
    
    result = {
        'total_products': total_products,
        'on_sale_products': on_sale_products,
        'total_orders': total_orders,
        'total_sales': total_sales,
        'total_customers': total_customers,
        'average_order_value': average_order_value,
        'orders_by_status': orders_by_status,
        'period': period
    }
    
    return success_response(result)

@merchant_bp.route('/order/list', methods=['GET'])
@merchant_required
def get_merchant_orders():
    """
    获取商家订单列表
    """
    user_id = get_jwt_identity()
    status = request.args.get('status', '')
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    
    # 查找商家信息
    merchant_info = MerchantInfo.query.filter_by(user_id=user_id).first()
    
    if not merchant_info:
        return error_response('商家信息不存在')
    
    merchant_id = merchant_info.id
    
    # 获取所有订单项中包含该商家商品的订单ID
    order_ids_query = db.session.query(OrderItem.order_id)\
        .join(Product, OrderItem.product_id == Product.id)\
        .filter(Product.merchant_id == merchant_id)
    
    if status:
        try:
            # 尝试解析JSON字符串
            if status.startswith('[') and status.endswith(']'):
                import json
                status_list = json.loads(status)
                order_ids_query = order_ids_query.join(Order, OrderItem.order_id == Order.id)\
                    .filter(Order.status.in_(status_list))
            # 处理逗号分隔的字符串
            elif isinstance(status, str) and ',' in status:
                status_list = status.split(',')
                order_ids_query = order_ids_query.join(Order, OrderItem.order_id == Order.id)\
                    .filter(Order.status.in_(status_list))
            else:
                order_ids_query = order_ids_query.join(Order, OrderItem.order_id == Order.id)\
                    .filter(Order.status == status)
        except Exception as e:
            current_app.logger.error(f"解析status参数异常: {str(e)}")
            order_ids_query = order_ids_query.join(Order, OrderItem.order_id == Order.id)\
                .filter(Order.status == status)
    
    order_ids = order_ids_query.distinct().all()
    order_ids = [id[0] for id in order_ids]
    
    # 获取订单总数
    total = len(order_ids)
    
    # 分页获取订单
    paginated_order_ids = order_ids[(page - 1) * limit:page * limit]
    
    orders = []
    if paginated_order_ids:
        # 根据订单ID获取订单
        orders = Order.query.filter(Order.id.in_(paginated_order_ids))\
            .order_by(Order.created_at.desc()).all()
    
    result = []
    for order in orders:
        # 获取订单中属于该商家的商品
        items = OrderItem.query.join(Product, OrderItem.product_id == Product.id)\
            .filter(OrderItem.order_id == order.id, Product.merchant_id == merchant_id).all()
        
        order_data = {
            'id': order.id,
            'order_no': order.order_no,
            'status': order.status.value,
            'total_amount': order.total_amount,
            'payment_amount': order.payment_amount,
            'create_time': order.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'items': [{
                'id': item.id,
                'product_id': item.product_id,
                'product_name': item.product_name,
                'product_image': item.product_image,
                'price': item.price,
                'quantity': item.quantity
            } for item in items]
        }
        
        result.append(order_data)
    
    return success_response({
        'total': total,
        'list': result,
        'page': page,
        'limit': limit
    })

@merchant_bp.route('/order/detail/<int:order_id>', methods=['GET'])
@merchant_required
def get_merchant_order_detail(order_id):
    """
    获取商家订单详情
    """
    user_id = get_jwt_identity()
    
    # 查找商家信息
    merchant_info = MerchantInfo.query.filter_by(user_id=user_id).first()
    
    if not merchant_info:
        return error_response('商家信息不存在')
    
    merchant_id = merchant_info.id
    
    # 获取订单
    order = Order.query.filter_by(id=order_id).first()
    
    if not order:
        return error_response('订单不存在')
    
    # 检查订单中是否有该商家的商品
    items = OrderItem.query.join(Product, OrderItem.product_id == Product.id)\
        .filter(OrderItem.order_id == order.id, Product.merchant_id == merchant_id).all()
    
    if not items:
        return error_response('该订单不属于您的商店')
    
    # 获取地址信息
    address = order.address
    address_info = {
        'name': address.name,
        'phone': address.phone,
        'province': address.province,
        'city': address.city,
        'district': address.district,
        'detail': address.detail
    }
    
    # 构建订单详情
    order_detail = {
        'id': order.id,
        'order_no': order.order_no,
        'status': order.status.value,
        'total_amount': order.total_amount,
        'payment_amount': order.payment_amount,
        'shipping_fee': 0,  # 目前系统不支持运费，设为0
        'create_time': order.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        'payment_time': order.payment_time.strftime('%Y-%m-%d %H:%M:%S') if order.payment_time else None,
        'shipping_time': order.shipping_time.strftime('%Y-%m-%d %H:%M:%S') if order.shipping_time else None,
        'complete_time': order.completion_time.strftime('%Y-%m-%d %H:%M:%S') if order.completion_time else None,
        'remark': order.remark,
        'address_info': address_info,
        'items': [{
            'id': item.id,
            'product_id': item.product_id,
            'product_name': item.product_name,
            'product_image': item.product_image,
            'price': item.price,
            'quantity': item.quantity,
            'spec_id': item.spec_id
        } for item in items]
    }
    
    return success_response(order_detail)

@merchant_bp.route('/order/process', methods=['POST'])
@merchant_required
def process_merchant_order():
    """
    处理商家订单
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    order_id = data.get('order_id')
    new_status = data.get('status')
    
    if not order_id or not new_status:
        return error_response('参数错误')
    
    # 查找商家信息
    merchant_info = MerchantInfo.query.filter_by(user_id=user_id).first()
    
    if not merchant_info:
        return error_response('商家信息不存在')
    
    merchant_id = merchant_info.id
    
    # 获取订单
    order = Order.query.filter_by(id=order_id).first()
    
    if not order:
        return error_response('订单不存在')
    
    # 检查订单中是否有该商家的商品
    items_exist = db.session.query(OrderItem).join(Product, OrderItem.product_id == Product.id)\
        .filter(OrderItem.order_id == order.id, Product.merchant_id == merchant_id).first() is not None
    
    if not items_exist:
        return error_response('该订单不属于您的商店')
    
    # 检查状态是否合法
    valid_status_transitions = {
        'pending_payment': ['cancelled'],
        'pending_shipment': ['pending_receipt'],
        'pending_receipt': ['completed']
    }
    
    current_status = order.status.value
    
    if current_status not in valid_status_transitions or new_status not in valid_status_transitions.get(current_status, []):
        return error_response(f'无法将订单从 {current_status} 状态改为 {new_status} 状态')
    
    # 更新订单状态
    order.status = new_status
    
    # 更新相关时间字段
    now = datetime.now()
    if new_status == 'pending_receipt':
        order.shipping_time = now
    elif new_status == 'completed':
        order.completion_time = now
    
    try:
        db.session.commit()
        return success_response(message='订单状态更新成功')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"更新订单状态异常: {str(e)}")
        return error_response('订单状态更新失败，请稍后再试')

@merchant_bp.route('/product/list', methods=['GET'])
@merchant_required
def get_merchant_products():
    """
    获取商家商品列表
    """
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    keyword = request.args.get('keyword', '')
    category_id = request.args.get('category_id', type=int)
    status = request.args.get('status', '')  # 'on_sale', 'off_sale', ''(全部)
    
    # 查找商家信息
    merchant_info = MerchantInfo.query.filter_by(user_id=user_id).first()
    
    if not merchant_info:
        return error_response('商家信息不存在')
    
    merchant_id = merchant_info.id
    
    # 构建查询
    query = Product.query.filter_by(merchant_id=merchant_id)
    
    # 关键词搜索
    if keyword:
        query = query.filter(Product.name.like(f'%{keyword}%'))
    
    # 分类筛选
    if category_id:
        query = query.filter_by(category_id=category_id)
    
    # 状态筛选
    if status == 'on_sale':
        query = query.filter_by(is_on_sale=True)
    elif status == 'off_sale':
        query = query.filter_by(is_on_sale=False)
    
    # 获取总数
    total = query.count()
    
    # 分页查询
    products = query.order_by(Product.created_at.desc())\
        .offset((page - 1) * limit).limit(limit).all()
    
    product_list = []
    for product in products:
        # 商品详情
        product_data = {
            'id': product.id,
            'name': product.name,
            'main_image': product.main_image,
            'price': product.price,
            'original_price': product.original_price,
            'stock': product.stock,
            'sales': product.sales,
            'is_on_sale': product.is_on_sale,
            'category_id': product.category_id,
            'category_name': product.product_category.name if product.product_category else '',
            'description': product.description,
            'create_time': product.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        product_list.append(product_data)
    
    return success_response({
        'total': total,
        'list': product_list,
        'page': page,
        'limit': limit
    })

def validate_specs_stock(specs, product_stock):
    """
    验证规格库存总量不超过商品总库存的辅助函数
    """
    if not specs:
        return True
    
    total_specs_stock = sum(spec.get('stock', 0) for spec in specs)
    return total_specs_stock <= product_stock

@merchant_bp.route('/product/add', methods=['POST'])
@merchant_required
def add_product():
    """
    商家添加商品
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # 验证必填字段
    required_fields = ['name', 'price', 'stock', 'main_image']
    for field in required_fields:
        if field not in data or not data[field]:
            return error_response(f'缺少必填字段: {field}')
    
    # 查找商家信息
    merchant_info = MerchantInfo.query.filter_by(user_id=user_id).first()
    
    if not merchant_info:
        return error_response('商家信息不存在')
    
    merchant_id = merchant_info.id
    
    # 验证规格库存总量
    if 'specs' in data and isinstance(data['specs'], list) and len(data['specs']) > 0:
        if not validate_specs_stock(data['specs'], data['stock']):
            return error_response('规格库存总量不能超过商品总库存')
    
    try:
        # 创建新商品
        product = Product(
            name=data['name'],
            merchant_id=merchant_id,
            category_id=data.get('category_id'),
            price=data['price'],
            original_price=data.get('original_price', data['price']),
            stock=data['stock'],
            main_image=data['main_image'],
            description=data.get('description', ''),
            is_on_sale=data.get('is_on_sale', True),
            is_new=data.get('is_new', False),
            is_hot=data.get('is_hot', False),
            is_recommend=data.get('is_recommend', False)
        )
        
        db.session.add(product)
        db.session.flush()  # 获取产品ID
        
        # 保存商品图片集
        if 'gallery' in data and isinstance(data['gallery'], list):
            for i, image_url in enumerate(data['gallery']):
                product_image = ProductImage(
                    product_id=product.id,
                    image_url=image_url,
                    sort_order=i
                )
                db.session.add(product_image)
        
        # 保存商品规格
        if 'specs' in data and isinstance(data['specs'], list) and len(data['specs']) > 0:
            for spec_data in data['specs']:
                if not all(key in spec_data for key in ['name', 'value', 'price', 'stock']):
                    continue  # 跳过不完整的规格数据
                
                spec = ProductSpec(
                    product_id=product.id,
                    name=spec_data['name'],
                    value=spec_data['value'],
                    price=spec_data['price'],
                    stock=spec_data['stock']
                )
                db.session.add(spec)
        
        db.session.commit()
        
        return success_response({
            'id': product.id,
            'name': product.name
        }, message='商品添加成功')
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"添加商品异常: {str(e)}")
        return error_response('商品添加失败，请稍后再试')

@merchant_bp.route('/product/update', methods=['POST'])
@merchant_required
def update_product():
    """
    商家更新商品信息
    """
    user_id = get_jwt_identity()
    
    # 尝试获取请求数据
    try:
        data = request.get_json(force=True)
        current_app.logger.info(f"原始请求数据: {request.data}, 解析后数据: {data}, 类型: {type(data)}")
    except Exception as e:
        current_app.logger.error(f"解析请求数据失败: {str(e)}, 原始数据: {request.data}")
        data = request.get_json(silent=True) or {}
        if not data and request.data:
            try:
                # 尝试手动解析数据
                import json
                data = json.loads(request.data.decode('utf-8'))
                current_app.logger.info(f"手动解析数据成功: {data}")
            except Exception as e:
                current_app.logger.error(f"手动解析数据失败: {str(e)}")
    
    # 添加详细日志记录
    current_app.logger.info(f"接收到的更新商品请求数据: {data}, 类型: {type(data)}")
    
    # 验证必填字段 - 处理data可能是int的情况
    if isinstance(data, int):
        # 如果data是整数，说明直接传递了product_id
        product_id = data
        current_app.logger.info(f"产品ID直接作为整数传递: {product_id}")
        data = {}
    elif isinstance(data, dict) and 'id' in data:
        # 正常情况，从data中获取id
        product_id = data['id']
        current_app.logger.info(f"从字典中获取产品ID: {product_id}")
    else:
        current_app.logger.error(f"缺少商品ID, 接收到的数据: {data}")
        return error_response('缺少商品ID')
    
    # 查找商家信息
    merchant_info = MerchantInfo.query.filter_by(user_id=user_id).first()
    
    if not merchant_info:
        current_app.logger.error(f"商家信息不存在, user_id: {user_id}")
        return error_response('商家信息不存在')
    
    merchant_id = merchant_info.id
    
    # 查找商品
    product = Product.query.filter_by(id=product_id, merchant_id=merchant_id).first()
    
    if not product:
        current_app.logger.error(f"商品不存在或没有权限修改, product_id: {product_id}, merchant_id: {merchant_id}")
        return error_response('商品不存在或您没有权限修改')
    
    try:
        # 验证规格库存总量
        if 'specs' in data and isinstance(data['specs'], list) and 'stock' in data:
            if not validate_specs_stock(data['specs'], data['stock']):
                return error_response('规格库存总量不能超过商品总库存')
        
        # 更新商品信息
        if 'name' in data:
            product.name = data['name']
        
        if 'category_id' in data:
            product.category_id = data['category_id']
        
        if 'price' in data:
            product.price = data['price']
        
        if 'original_price' in data:
            product.original_price = data['original_price']
        
        if 'stock' in data:
            product.stock = data['stock']
        
        if 'main_image' in data:
            product.main_image = data['main_image']
        
        if 'description' in data:
            product.description = data.get('description', '')
        
        if 'is_on_sale' in data:
            product.is_on_sale = data['is_on_sale']
            
        if 'is_new' in data:
            product.is_new = data['is_new']
            
        if 'is_hot' in data:
            product.is_hot = data['is_hot']
            
        if 'is_recommend' in data:
            product.is_recommend = data['is_recommend']
        
        # 更新商品图片集
        if 'gallery' in data and isinstance(data['gallery'], list):
            # 删除现有的图片
            ProductImage.query.filter_by(product_id=product.id).delete()
            
            # 添加新的图片
            for i, image_url in enumerate(data['gallery']):
                product_image = ProductImage(
                    product_id=product.id,
                    image_url=image_url,
                    sort_order=i
                )
                db.session.add(product_image)
        
        # 更新商品规格
        if 'specs' in data and isinstance(data['specs'], list):
            # 获取现有规格ID列表
            existing_specs = ProductSpec.query.filter_by(product_id=product.id).all()
            existing_spec_ids = [spec.id for spec in existing_specs]
            
            # 记录更新后的规格ID
            updated_spec_ids = []
            
            # 处理每个规格
            for spec_data in data['specs']:
                if 'id' in spec_data and spec_data['id'] in existing_spec_ids:
                    # 更新已存在的规格
                    spec = ProductSpec.query.get(spec_data['id'])
                    spec.name = spec_data['name']
                    spec.value = spec_data['value']
                    spec.price = spec_data['price']
                    spec.stock = spec_data['stock']
                    updated_spec_ids.append(spec.id)
                else:
                    # 添加新规格
                    new_spec = ProductSpec(
                        product_id=product.id,
                        name=spec_data['name'],
                        value=spec_data['value'],
                        price=spec_data['price'],
                        stock=spec_data['stock']
                    )
                    db.session.add(new_spec)
                    db.session.flush()  # 获取新ID
                    updated_spec_ids.append(new_spec.id)
            
            # 删除不再需要的规格
            for spec_id in existing_spec_ids:
                if spec_id not in updated_spec_ids:
                    ProductSpec.query.filter_by(id=spec_id).delete()
        
        db.session.commit()
        
        return success_response(message='商品更新成功')
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"更新商品异常: {str(e)}")
        return error_response('商品更新失败，请稍后再试')

@merchant_bp.route('/product/remove', methods=['POST'])
@merchant_required
def remove_product():
    """
    商家删除商品
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # 验证必填字段
    if 'id' not in data:
        return error_response('缺少商品ID')
    
    # 查找商家信息
    merchant_info = MerchantInfo.query.filter_by(user_id=user_id).first()
    
    if not merchant_info:
        return error_response('商家信息不存在')
    
    merchant_id = merchant_info.id
    
    # 查找商品
    product = Product.query.filter_by(id=data['id'], merchant_id=merchant_id).first()
    
    if not product:
        return error_response('商品不存在或您没有权限删除')
    
    try:
        # 检查是否有关联的订单
        orders_with_product = db.session.query(OrderItem).filter_by(product_id=product.id).first()
        
        if orders_with_product:
            # 如果商品已经有订单，则只标记为下架而不删除
            product.is_on_sale = False
            db.session.commit()
            return success_response(message='商品已下架')
        else:
            # 首先删除商品关联的收藏记录
            Favorite.query.filter_by(product_id=product.id).delete()
            
            # 删除商品关联的图片
            ProductImage.query.filter_by(product_id=product.id).delete()
            
            # 最后删除商品本身
            db.session.delete(product)
            db.session.commit()
            return success_response(message='商品已删除')
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"删除商品异常: {str(e)}")
        return error_response('商品删除失败，请稍后再试') 

@merchant_bp.route('/coupon/list', methods=['GET'])
@merchant_required
def get_merchant_coupons():
    """
    获取商家优惠券列表
    """
    merchant_id = get_merchant_id()
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    
    # 构建查询
    query = Coupon.query.filter_by(merchant_id=merchant_id)
    
    # 分页
    total = query.count()
    coupons = query.order_by(Coupon.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    result = []
    
    for coupon in coupons:
        result.append({
            'id': coupon.id,
            'title': coupon.title,
            'description': coupon.description,
            'amount': coupon.amount,
            'min_spend': coupon.min_spend,
            'start_date': coupon.start_date.strftime('%Y-%m-%d %H:%M:%S'),
            'end_date': coupon.end_date.strftime('%Y-%m-%d %H:%M:%S'),
            'coupon_code': coupon.coupon_code,
            'quantity': coupon.quantity,
            'used_count': coupon.used_count,
            'is_active': coupon.is_active,
            'category_id': coupon.category_id,
            'created_at': coupon.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    return success_response({
        'total': total,
        'list': result,
        'page': page,
        'limit': limit
    })

@merchant_bp.route('/coupon/create', methods=['POST'])
@merchant_required
def create_coupon():
    """
    创建优惠券
    """
    merchant_id = get_merchant_id()
    data = request.get_json()
    
    title = data.get('title')
    description = data.get('description', '')
    amount = data.get('amount')
    min_spend = data.get('min_spend', 0)
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    quantity = data.get('quantity', -1)
    category_id = data.get('category_id')
    
    # 验证必填字段
    if not title or not amount or not start_date_str or not end_date_str:
        return error_response('请填写必填字段')
    
    try:
        amount = float(amount)
        min_spend = float(min_spend)
        
        if amount <= 0:
            return error_response('优惠金额必须大于0')
        
        if min_spend < 0:
            return error_response('最低消费金额不能为负数')
        
        # 解析日期
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d %H:%M:%S')
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d %H:%M:%S')
        except:
            return error_response('日期格式不正确')
        
        if start_date >= end_date:
            return error_response('结束日期必须晚于开始日期')
            
        # 生成优惠券码
        coupon_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        
        # 创建优惠券
        coupon = Coupon(
            merchant_id=merchant_id,
            title=title,
            description=description,
            amount=amount,
            min_spend=min_spend,
            start_date=start_date,
            end_date=end_date,
            coupon_code=coupon_code,
            quantity=quantity,
            category_id=category_id if category_id else None
        )
        
        db.session.add(coupon)
        db.session.commit()
        
        return success_response(message='创建优惠券成功')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"创建优惠券异常: {str(e)}")
        return error_response('创建优惠券失败，请稍后再试')

@merchant_bp.route('/coupon/update', methods=['POST'])
@merchant_required
def update_coupon():
    """
    更新优惠券
    """
    merchant_id = get_merchant_id()
    data = request.get_json()
    
    coupon_id = data.get('id')
    title = data.get('title')
    description = data.get('description')
    amount = data.get('amount')
    min_spend = data.get('min_spend')
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    is_active = data.get('is_active')
    quantity = data.get('quantity')
    category_id = data.get('category_id')
    
    if not coupon_id:
        return error_response('缺少优惠券ID')
    
    # 查找优惠券
    coupon = Coupon.query.filter_by(id=coupon_id, merchant_id=merchant_id).first()
    
    if not coupon:
        return error_response('优惠券不存在')
    
    try:
        # 更新字段
        if title is not None:
            coupon.title = title
        
        if description is not None:
            coupon.description = description
        
        if amount is not None:
            amount = float(amount)
            if amount <= 0:
                return error_response('优惠金额必须大于0')
            coupon.amount = amount
        
        if min_spend is not None:
            min_spend = float(min_spend)
            if min_spend < 0:
                return error_response('最低消费金额不能为负数')
            coupon.min_spend = min_spend
        
        if start_date_str is not None:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d %H:%M:%S')
                coupon.start_date = start_date
            except:
                return error_response('开始日期格式不正确')
        
        if end_date_str is not None:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d %H:%M:%S')
                coupon.end_date = end_date
            except:
                return error_response('结束日期格式不正确')
        
        if coupon.start_date >= coupon.end_date:
            return error_response('结束日期必须晚于开始日期')
        
        if is_active is not None:
            coupon.is_active = bool(is_active)
        
        if quantity is not None:
            coupon.quantity = int(quantity)
            
        if category_id is not None:
            coupon.category_id = category_id if category_id else None
        
        db.session.commit()
        return success_response(message='更新优惠券成功')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"更新优惠券异常: {str(e)}")
        return error_response('更新优惠券失败，请稍后再试')

@merchant_bp.route('/coupon/remove', methods=['POST'])
@merchant_required
def remove_coupon():
    """
    删除优惠券
    """
    merchant_id = get_merchant_id()
    data = request.get_json()
    
    coupon_id = data.get('id')
    
    if not coupon_id:
        return error_response('缺少优惠券ID')
    
    # 查找优惠券
    coupon = Coupon.query.filter_by(id=coupon_id, merchant_id=merchant_id).first()
    
    if not coupon:
        return error_response('优惠券不存在')
    
    try:
        # 检查是否有用户已领取此优惠券
        user_coupon_count = UserCoupon.query.filter_by(coupon_id=coupon_id).count()
        
        if user_coupon_count > 0:
            # 如果有用户领取，只设置为失效
            coupon.is_active = False
            db.session.commit()
            return success_response(message='优惠券已设为失效')
        else:
            # 如果没有用户领取，可以直接删除
            db.session.delete(coupon)
            db.session.commit()
            return success_response(message='优惠券已删除')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"删除优惠券异常: {str(e)}")
        return error_response('删除优惠券失败，请稍后再试') 