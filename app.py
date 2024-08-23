from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import random
import json
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/')
def index():
    return render_template('index.html')

def generate_data():
    # Define news titles, details, and URLs
    news_titles = [f'News {i+1}' for i in range(10)]
    news_details = [f'Details for News {i+1}' for i in range(10)]
    news_urls = [f'https://example.com/news{i+1}' for i in range(10)]  # Replace with actual URLs

    # Randomly generate nodes
    nodes = [{'id': 'Time & Date', 'type': 'central', 'children': news_titles}]
    for title, detail, url in zip(news_titles, news_details, news_urls):
        nodes.append({'id': title, 'type': 'news', 'details': detail, 'url': url, 'children': []})

    # Create links between center and news nodes
    links = [{'source': 'Time & Date', 'target': title} for title in news_titles]

    # Randomly adjust node sizes
    for node in nodes:
        node['size'] = random.uniform(20, 50)  # Random size between 20 and 50

    return {'nodes': nodes, 'links': links, 'date_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')}


def generate_data2():
    # Define news categories and titles
    categories = ['Crime', 'Sport', 'Finance', 'Tech']
    news_titles = [f'{category} News {i+1}' for category in categories for i in range(5)]
    news_details = [f'Details for {title}' for title in news_titles]

    # Randomly generate nodes
    nodes = [{'id': 'Time & Date', 'type': 'central', 'children': categories}]
    category_nodes = []

    for category in categories:
        category_node = {'id': category, 'type': 'category', 'children': [title for title in news_titles if category in title]}
        category_nodes.append(category_node)
        nodes.append(category_node)

    for title, detail in zip(news_titles, news_details):
        nodes.append({'id': title, 'type': 'news', 'details': detail, 'children': []})

    # Create links between central node and category nodes, and category nodes and news nodes
    links = [{'source': 'Time & Date', 'target': category} for category in categories]
    links.extend([{'source': category, 'target': title} for category in categories for title in news_titles if category in title])

    # Randomly adjust node sizes
    for node in nodes:
        node['size'] = random.uniform(20, 50)  # Random size between 20 and 50

    return {'nodes': nodes, 'links': links, 'date_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

# @socketio.on('connect')
# def handle_connect():
#     emit('update', generate_data())

# @socketio.on('update_data')
# def handle_update_data():
#     data = generate_data()
#     emit('update', data)

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
