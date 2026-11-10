from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import random
import json
from datetime import datetime
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/')
def index():
    return render_template('index.html')

def generate_data():
    categories = ['Crime', 'Sport', 'Finance', 'Tech']
    news_titles = [f'{category} News {i+1}' for category in categories for i in range(5)]
    news_details = [f'Detailed report about {title} developments.' for title in news_titles]
    news_urls = [f'https://example.com/news/{title.lower().replace(" ", "-")}' for title in news_titles]
    
    # Mock image URLs using Unsplash with keywords
    image_keywords = {
        'Crime': 'police,crime',
        'Sport': 'stadium,sport',
        'Finance': 'money,finance',
        'Tech': 'technology,code'
    }

    nodes = [{'id': 'time_central', 'type': 'central', 'label': datetime.now().strftime('%H:%M:%S')}]
    
    for cat in categories:
        nodes.append({'id': cat, 'type': 'category', 'label': cat})

    for i, (title, detail, url) in enumerate(zip(news_titles, news_details, news_urls)):
        category = next(c for c in categories if c in title)
        kw = image_keywords.get(category, 'news')
        nodes.append({
            'id': f'news_{i}',
            'type': 'news',
            'category': category,
            'label': title,
            'details': detail,
            'url': url,
            'image': f'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=150&q=80', # Generic news for now or specific kw
            'keyword': kw,
            'children': []
        })

    # Add specific images based on index for variety
    for i, node in enumerate(n for n in nodes if n['type'] == 'news'):
        node['image'] = f'https://picsum.photos/seed/{node["id"]}/150/150'

    links = []
    for cat in categories:
        links.append({'source': 'time_central', 'target': cat})
    
    for node in nodes:
        if node['type'] == 'news':
            links.append({'source': node['category'], 'target': node['id']})

    return {
        'nodes': nodes,
        'links': links,
        'timestamp': datetime.now().isoformat()
    }

def send_update():
    data = generate_data()
    socketio.emit('update', data, broadcast=True)

@socketio.on('connect')
def handle_connect():
    emit('update', generate_data())

@socketio.on('update_data')
def handle_update_data():
    send_update()

if __name__ == '__main__':
    socketio.run(app, debug=True)
