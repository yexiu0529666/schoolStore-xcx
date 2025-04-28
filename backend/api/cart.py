from flask import Blueprint, request, current_app
from flask_jwt_extended import get_jwt_identity

from models import db, User, Cart, CartItem, Product, ProductSpec
from utils import success_response, error_response, model_to_dict, user_required

cart_bp = Blueprint('cart', __name__)

@cart_bp.route('/list', methods=['GET'])
@user_required
def get_cart_list():
    """
    获取购物车列表
    """
    user_id = get_jwt_identity()
    
    # 获取或创建购物车
    cart = Cart.query.filter_by(user_id=user_id).first()
    
    if not cart:
        cart = Cart(user_id=user_id)
        db.session.add(cart)
        db.session.commit()
    
    # 获取购物车项
    cart_items = CartItem.query.filter_by(cart_id=cart.id).all()
    
    # 构建响应数据
    items = []
    total_price = 0
    
    for item in cart_items:
        product = Product.query.get(item.product_id)
        
        if not product or not product.is_on_sale:
            continue
        
        # 商品规格
        spec = None
        price = product.price
        
        if item.spec_id:
            spec = ProductSpec.query.get(item.spec_id)
            if spec:
                price = spec.price
        
        item_data = {
            'id': item.id,
            'product_id': product.id,
            'product_name': product.name,
            'product_image': product.main_image,
            'price': price,
            'quantity': item.quantity,
            'selected': item.selected,
            'spec_id': item.spec_id,
            'spec_name': spec.name if spec else None,
            'spec_value': spec.value if spec else None,
            'category_id': product.category_id
        }
        
        items.append(item_data)
        
        if item.selected:
            total_price += price * item.quantity
    
    return success_response({
        'cart_id': cart.id,
        'items': items,
        'total_price': total_price,
        'item_count': len(items)
    })

@cart_bp.route('/add', methods=['POST'])
@user_required
def add_to_cart():
    """
    添加商品到购物车
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    product_id = data.get('product_id')
    spec_id = data.get('spec_id')
    quantity = data.get('quantity', 1)
    
    if not product_id:
        return error_response('商品ID不能为空')
    
    if quantity < 1:
        return error_response('商品数量必须大于0')
    
    # 检查商品是否存在
    product = Product.query.get(product_id)
    if not product:
        return error_response('商品不存在')
    
    if not product.is_on_sale:
        return error_response('商品已下架')
    
    # 检查规格是否存在
    if spec_id:
        spec = ProductSpec.query.get(spec_id)
        if not spec or spec.product_id != product_id:
            return error_response('商品规格不存在')
        
        # 检查库存
        if spec.stock < quantity:
            return error_response('商品库存不足')
    else:
        # 检查库存
        if product.stock < quantity:
            return error_response('商品库存不足')
    
    # 获取或创建购物车
    cart = Cart.query.filter_by(user_id=user_id).first()
    
    if not cart:
        cart = Cart(user_id=user_id)
        db.session.add(cart)
        db.session.commit()
    
    # 检查购物车中是否已有该商品
    cart_item = CartItem.query.filter_by(
        cart_id=cart.id,
        product_id=product_id,
        spec_id=spec_id
    ).first()
    
    if cart_item:
        # 更新数量
        cart_item.quantity += quantity
    else:
        # 创建新的购物车项
        cart_item = CartItem(
            cart_id=cart.id,
            product_id=product_id,
            spec_id=spec_id,
            quantity=quantity,
            selected=True
        )
        db.session.add(cart_item)
    
    try:
        db.session.commit()
        return success_response(message='商品已添加到购物车')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"添加购物车异常: {str(e)}")
        return error_response('添加购物车失败，请稍后再试')

@cart_bp.route('/update', methods=['POST'])
@user_required
def update_cart_item():
    """
    更新购物车项
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    item_id = data.get('id')
    quantity = data.get('quantity')
    selected = data.get('selected')
    
    if not item_id:
        return error_response('购物车项ID不能为空')
    
    # 获取购物车
    cart = Cart.query.filter_by(user_id=user_id).first()
    
    if not cart:
        return error_response('购物车不存在')
    
    # 获取购物车项
    cart_item = CartItem.query.filter_by(id=item_id, cart_id=cart.id).first()
    
    if not cart_item:
        return error_response('购物车项不存在')
    
    # 更新数量
    if quantity is not None:
        if quantity < 1:
            return error_response('商品数量必须大于0')
        
        # 检查库存
        product = Product.query.get(cart_item.product_id)
        
        if not product:
            return error_response('商品不存在')
        
        if not product.is_on_sale:
            return error_response('商品已下架')
        
        if cart_item.spec_id:
            spec = ProductSpec.query.get(cart_item.spec_id)
            if not spec:
                return error_response('商品规格不存在')
            
            if spec.stock < quantity:
                return error_response('商品库存不足')
        else:
            if product.stock < quantity:
                return error_response('商品库存不足')
        
        cart_item.quantity = quantity
    
    # 更新选中状态
    if selected is not None:
        cart_item.selected = selected
    
    try:
        db.session.commit()
        return success_response(message='购物车已更新')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"更新购物车异常: {str(e)}")
        return error_response('更新购物车失败，请稍后再试')

@cart_bp.route('/remove', methods=['POST'])
@user_required
def remove_cart_item():
    """
    删除购物车项
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    item_id = data.get('id')
    
    if not item_id:
        return error_response('购物车项ID不能为空')
    
    # 获取购物车
    cart = Cart.query.filter_by(user_id=user_id).first()
    
    if not cart:
        return error_response('购物车不存在')
    
    # 获取购物车项
    cart_item = CartItem.query.filter_by(id=item_id, cart_id=cart.id).first()
    
    if not cart_item:
        return error_response('购物车项不存在')
    
    try:
        db.session.delete(cart_item)
        db.session.commit()
        return success_response(message='商品已从购物车移除')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"删除购物车项异常: {str(e)}")
        return error_response('删除购物车项失败，请稍后再试')

@cart_bp.route('/clear', methods=['POST'])
@user_required
def clear_cart():
    """
    清空购物车
    """
    user_id = get_jwt_identity()
    
    # 获取购物车
    cart = Cart.query.filter_by(user_id=user_id).first()
    
    if not cart:
        return success_response(message='购物车已清空')
    
    try:
        CartItem.query.filter_by(cart_id=cart.id).delete()
        db.session.commit()
        return success_response(message='购物车已清空')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"清空购物车异常: {str(e)}")
        return error_response('清空购物车失败，请稍后再试')

@cart_bp.route('/checkout_items', methods=['POST'])
@user_required
def get_checkout_items():
    """
    获取结算商品项
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    cart_item_ids = data.get('cart_item_ids', [])
    
    if not cart_item_ids:
        return error_response('请选择商品')
    
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
    
    # 构建响应数据
    items = []
    total_price = 0
    
    for item in cart_items:
        product = Product.query.get(item.product_id)
        
        if not product or not product.is_on_sale:
            continue
        
        # 商品规格
        spec = None
        price = product.price
        
        if item.spec_id:
            spec = ProductSpec.query.get(item.spec_id)
            if spec:
                price = spec.price
        
        item_data = {
            'id': item.id,
            'product_id': product.id,
            'product_name': product.name,
            'product_image': product.main_image,
            'price': price,
            'quantity': item.quantity,
            'spec_id': item.spec_id,
            'spec_name': spec.name if spec else None,
            'spec_value': spec.value if spec else None,
            'category_id': product.category_id
        }
        
        items.append(item_data)
        total_price += price * item.quantity
    
    return success_response({
        'items': items,
        'total_price': total_price,
        'item_count': len(items)
    }) 