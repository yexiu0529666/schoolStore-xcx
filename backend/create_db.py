import pymysql
import traceback
from config import Config

# 默认配置
db_user = Config.DB_USER
db_password = Config.DB_PASSWORD
db_host = Config.DB_HOST
db_port = int(Config.DB_PORT)
db_name = Config.DB_NAME

def create_database():
    conn = None
    try:
        print(f"尝试连接到MySQL服务器: {db_host}:{db_port} 使用用户名: {db_user}")
        
        # 连接到MySQL服务器（不指定数据库）
        conn = pymysql.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password
        )
        
        print("成功连接到MySQL服务器")
        cursor = conn.cursor()
        
        # 创建数据库（如果不存在）
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print(f"数据库 '{db_name}' 创建成功或已存在")
        
        # 创建开发数据库
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS campus_mall_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print(f"数据库 'campus_mall_dev' 创建成功或已存在")
        
        # 创建测试数据库
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS campus_mall_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print(f"数据库 'campus_mall_test' 创建成功或已存在")
        
        cursor.close()
        conn.close()
        print("数据库初始化完成")
        return True
    except Exception as e:
        print(f"创建数据库时出错: {str(e)}")
        print(traceback.format_exc())
        return False
    finally:
        if conn:
            try:
                conn.close()
                print("数据库连接已关闭")
            except:
                pass

if __name__ == "__main__":
    create_database() 