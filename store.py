from flask import Flask, request, jsonify, send_from_directory, redirect, url_for
import os
import json
import sqlite3
import base64
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Contraseña para la autenticación admin
password = "LM1677"

# Get the current directory
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# Database configuration
DB_PATH = os.path.join(CURRENT_DIR, 'store.db')
UPLOAD_FOLDER = os.path.join(CURRENT_DIR, 'public', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def init_db():
    """Initialize the database with required tables if they don't exist."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create products table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            description TEXT,
            image TEXT
        )
    ''')
    
    # Create tags table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )
    ''')
    
    # Create product_tags relation table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS product_tags (
            product_id INTEGER,
            tag_id INTEGER,
            PRIMARY KEY (product_id, tag_id),
            FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    
    # Check if we need to migrate data from JSON
    cursor.execute("SELECT COUNT(*) FROM products")
    if cursor.fetchone()[0] == 0:
        try:
            # Try to migrate data from existing JSON file
            json_path = os.path.join(CURRENT_DIR, 'public', 'products.json')
            if os.path.exists(json_path):
                with open(json_path, 'r', encoding='utf-8') as file:
                    products = json.load(file)
                
                for product in products:
                    # Insert product
                    cursor.execute('''
                        INSERT INTO products (id, name, price, description, image)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (
                        product['id'],
                        product['name'],
                        product['price'],
                        product['description'],
                        product['image']
                    ))
                    
                    product_id = product['id']
                    
                    # Process tags
                    for tag_name in product['tags']:
                        # Add tag if it doesn't exist
                        cursor.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag_name,))
                        
                        # Get tag id
                        cursor.execute("SELECT id FROM tags WHERE name = ?", (tag_name,))
                        tag_id = cursor.fetchone()[0]
                        
                        # Link product to tag
                        cursor.execute('''
                            INSERT OR IGNORE INTO product_tags (product_id, tag_id)
                            VALUES (?, ?)
                        ''', (product_id, tag_id))
                
                conn.commit()
                print("Data successfully migrated from JSON to SQLite")
        except Exception as e:
            print(f"Error migrating data: {e}")
    
    conn.close()

# Initialize database when the app starts
init_db()
@app.route('/favicon.ico')
def serve_favicon():
    public_dir = os.path.join(CURRENT_DIR, 'public')
    return send_from_directory(public_dir, "favicon.ico")

@app.route('/')
def serve_index():
    public_dir = os.path.join(CURRENT_DIR, 'public')
    return send_from_directory(public_dir, "index.html")

@app.route('/<filename>')
def serve_file(filename):
    public_dir = os.path.join(CURRENT_DIR, 'public')
    
    if os.path.exists(os.path.join(public_dir, filename + ".html")):
        return send_from_directory(public_dir, filename + ".html")
    elif os.path.exists(os.path.join(public_dir, filename)):
        return send_from_directory(public_dir, filename)
    else:
        return page_not_found(404)

@app.route('/uploads/<filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# API for authentication
@app.route('/api/auth', methods=['POST'])
def authenticate():
    data = request.json
    if data and data.get('password') == password:
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Contraseña incorrecta'}), 401

# API to get all products with their tags
@app.route('/products.json')
def get_products_json():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all products
        cursor.execute('''
            SELECT * FROM products
        ''')
        
        products = []
        for row in cursor.fetchall():
            product = dict(row)
            
            # Get tags for this product
            cursor.execute('''
                SELECT t.name FROM tags t
                JOIN product_tags pt ON t.id = pt.tag_id
                WHERE pt.product_id = ?
            ''', (product['id'],))
            
            product['tags'] = [tag[0] for tag in cursor.fetchall()]
            products.append(product)
        
        conn.close()
        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API to get all products for admin panel
@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all products
        cursor.execute('''
            SELECT * FROM products
        ''')
        
        products = []
        for row in cursor.fetchall():
            product = dict(row)
            
            # Get tags for this product
            cursor.execute('''
                SELECT t.name FROM tags t
                JOIN product_tags pt ON t.id = pt.tag_id
                WHERE pt.product_id = ?
            ''', (product['id'],))
            
            product['tags'] = [tag[0] for tag in cursor.fetchall()]
            products.append(product)
        
        conn.close()
        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API to get all available tags
@app.route('/api/tags', methods=['GET'])
def get_tags():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM tags")
        tags = [tag[0] for tag in cursor.fetchall()]
        
        conn.close()
        return jsonify(tags)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API to add a new product
@app.route('/api/products', methods=['POST'])
def add_product():
    try:
        data = request.form.to_dict()
        
        # Handle image upload
        image_filename = ''
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                # Add timestamp to prevent caching issues
                base_name, extension = os.path.splitext(filename)
                image_filename = f"{base_name}_{os.urandom(4).hex()}{extension}"
                file_path = os.path.join(UPLOAD_FOLDER, image_filename)
                file.save(file_path)
                image_filename = 'uploads/' + image_filename
        
        # Connect to database
        conn = sqlite3.connect(DB_PATH)
        # Enable foreign keys support
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Insert new product
        cursor.execute('''
            INSERT INTO products (name, price, description, image)
            VALUES (?, ?, ?, ?)
        ''', (
            data['name'],
            float(data['price']),
            data['description'],
            image_filename
        ))
        
        product_id = cursor.lastrowid
        
        # Process tags
        if 'tags' in data:
            tags = data['tags'].split(',')
            for tag_name in tags:
                tag_name = tag_name.strip()
                if tag_name:
                    # Add tag if it doesn't exist
                    cursor.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag_name,))
                    
                    # Get tag id
                    cursor.execute("SELECT id FROM tags WHERE name = ?", (tag_name,))
                    tag_id = cursor.fetchone()[0]
                    
                    # Link product to tag
                    cursor.execute('''
                        INSERT INTO product_tags (product_id, tag_id)
                        VALUES (?, ?)
                    ''', (product_id, tag_id))
        
        conn.commit()
        
        # Get the newly created product with its tags
        cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        product_row = cursor.fetchone()
        if product_row:
            product = dict(product_row)
            
            cursor.execute('''
                SELECT t.name FROM tags t
                JOIN product_tags pt ON t.id = pt.tag_id
                WHERE pt.product_id = ?
            ''', (product_id,))
            
            product['tags'] = [tag[0] for tag in cursor.fetchall()]
            
            conn.close()
            return jsonify(product)
        else:
            conn.close()
            return jsonify({'error': 'Failed to retrieve created product'}), 500
    except Exception as e:
        print(f"Error adding product: {e}")
        return jsonify({'error': str(e)}), 500

# API to update an existing product
@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        data = request.form.to_dict()
        
        # Connect to database
        conn = sqlite3.connect(DB_PATH)
        # Enable foreign keys support
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check if product exists
        cursor.execute("SELECT image FROM products WHERE id = ?", (product_id,))
        existing = cursor.fetchone()
        if not existing:
            conn.close()
            return jsonify({'error': 'Product not found'}), 404
        
        old_image = existing[0]
        
        # Handle image upload
        image_filename = old_image
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                base_name, extension = os.path.splitext(filename)
                image_filename = f"{base_name}_{os.urandom(4).hex()}{extension}"
                file_path = os.path.join(UPLOAD_FOLDER, image_filename)
                file.save(file_path)
                image_filename = 'uploads/' + image_filename
                
                # Delete old image if it was in uploads folder
                if old_image and old_image.startswith('uploads/'):
                    old_path = os.path.join(CURRENT_DIR, 'public', old_image)
                    if os.path.exists(old_path):
                        os.remove(old_path)
        
        # Update product
        cursor.execute('''
            UPDATE products 
            SET name = ?, price = ?, description = ?, image = ?
            WHERE id = ?
        ''', (
            data['name'],
            float(data['price']),
            data['description'],
            image_filename,
            product_id
        ))
        
        # Delete existing tag relations
        cursor.execute("DELETE FROM product_tags WHERE product_id = ?", (product_id,))
        
        # Process tags
        if 'tags' in data:
            tags = data['tags'].split(',')
            for tag_name in tags:
                tag_name = tag_name.strip()
                if tag_name:
                    # Add tag if it doesn't exist
                    cursor.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag_name,))
                    
                    # Get tag id
                    cursor.execute("SELECT id FROM tags WHERE name = ?", (tag_name,))
                    tag_id = cursor.fetchone()[0]
                    
                    # Link product to tag
                    cursor.execute('''
                        INSERT INTO product_tags (product_id, tag_id)
                        VALUES (?, ?)
                    ''', (product_id, tag_id))
        
        conn.commit()
        
        # Get the updated product with its tags
        cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        product_row = cursor.fetchone()
        if product_row:
            product = dict(product_row)
            
            cursor.execute('''
                SELECT t.name FROM tags t
                JOIN product_tags pt ON t.id = pt.tag_id
                WHERE pt.product_id = ?
            ''', (product_id,))
            
            product['tags'] = [tag[0] for tag in cursor.fetchall()]
            
            conn.close()
            return jsonify(product)
        else:
            conn.close()
            return jsonify({'error': 'Failed to retrieve updated product'}), 500
    except Exception as e:
        print(f"Error updating product: {e}")
        return jsonify({'error': str(e)}), 500

# API to delete a product
@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        # Connect to database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get product image
        cursor.execute("SELECT image FROM products WHERE id = ?", (product_id,))
        product = cursor.fetchone()
        
        if not product:
            conn.close()
            return jsonify({'error': 'Product not found'}), 404
            
        # Delete image file if it's in uploads folder
        image_path = product[0]
        if image_path and image_path.startswith('uploads/'):
            file_path = os.path.join(CURRENT_DIR, 'public', image_path)
            if os.path.exists(file_path):
                os.remove(file_path)
        
        # Delete product (cascade will remove product_tags)
        cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
        conn.commit()
        
        # Clean up orphaned tags
        cursor.execute('''
            DELETE FROM tags 
            WHERE id NOT IN (SELECT DISTINCT tag_id FROM product_tags)
        ''')
        conn.commit()
        
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def page_not_found(e):
    public_dir = os.path.join(CURRENT_DIR, 'public')
    return send_from_directory(public_dir, "404.html"), 404


if __name__ == '__main__':
    app.run(debug=True)