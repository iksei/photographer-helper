from flask import Flask, render_template, request, jsonify
import os
import json
from datetime import datetime
import requests
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)

app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
TODOS_FILE = 'todos.json'


def calculate_dof(aperture, focal_length, distance, circle_of_confusion=0.03):
    f = focal_length
    dist_mm = distance * 1000
    hyperfocal_mm = (f * f) / (aperture * circle_of_confusion) + f

    near_mm = (hyperfocal_mm * dist_mm) / (hyperfocal_mm + (dist_mm - f))
    denominator = hyperfocal_mm - (dist_mm - f)
    if denominator <= 0:
        far = float('inf')
        dof = float('inf')
    else:
        far_mm = (hyperfocal_mm * dist_mm) / denominator
        dof_mm = far_mm - near_mm

    near = near_mm / 1000.0
    far = far_mm / 1000.0 if far_mm != float('inf') else float('inf')
    dof = dof_mm / 1000.0 if dof_mm != float('inf') else float('inf')
    hyperfocal = hyperfocal_mm / 1000.0

    return {
        'near': round(near, 3),
        'far': round(far, 3) if far != float('inf') else 'бесконечность',
        'dof': round(dof, 3) if dof != float('inf') else 'бесконечность',
        'hyperfocal': round(hyperfocal, 3)
    }

def calculate_shutter_speed(iso, aperture, ev=None):
    if ev is None:
        ev = 15
    exact_shutter = (iso * aperture * aperture) / (ev * 100)
    print(f"DEBUG: iso={iso}, aperture={aperture}, ev={ev}, shutter={exact_shutter}")
    standard_shutters = [1/8000, 1/4000, 1/2000, 1/1000, 1/500, 1/250, 1/125, 1/60, 1/30, 1/15, 1/8, 1/4, 1/2, 1, 2, 4, 8, 15, 30]
    closest_shutter = min(standard_shutters, key=lambda x: abs(x - exact_shutter))
    if closest_shutter < 1:
        shutter_str = f"1/{int(1/closest_shutter)}"
    else:
        shutter_str = f"{int(closest_shutter)}"
    return {
        'exact': round(exact_shutter, 4),
        'recommended': shutter_str,
        'ev': ev
    }

def load_todos():
    if os.path.exists('todos.json'):
        with open('todos.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_todos(todos):
    with open('todos.json', 'w', encoding='utf-8') as f:
        json.dump(todos, f, ensure_ascii=False, indent=2)

def get_next_id(todos):
    if not todos:
        return 1
    return max([t['id'] for t in todos]) +1

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/plan')
def plan():
    return render_template('plan.html')

@app.route('/tools')
def tools():
    return render_template('tools.html')

@app.route('/api/dof')
def calculate_dof_api():
    try:
        aperture = float(request.args.get('aperture', 2.8))
        focal = float(request.args.get('focal', 50))
        distance = float(request.args.get('distance', 5))
        coc = float(request.args.get('coc', 0.03))
        result = calculate_dof(aperture, focal, distance, coc)
        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/shutter')
def calculate_shutter():
    try:
        iso = float(request.args.get('iso', 100))
        aperture = float(request.args.get('aperture', 16))
        ev = request.args.get('ev', None)
        if ev:
            ev = float(ev)
        result = calculate_shutter_speed(iso, aperture, ev)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/todos', methods=['GET'])
def get_todos():
    todos = load_todos()
    return jsonify(todos)

@app.route('/api/todos', methods=['POST'])
def add_todo():
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({'error': 'Не передан текст'}), 400
    todos = load_todos()
    new_todo = {
        'id': get_next_id(todos),
        'text': data['text'],
        'done': False
    }
    todos.append(new_todo)
    save_todos(todos)
    return jsonify(new_todo), 201

@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
def toggle_todo(todo_id):
    todos = load_todos()
    for todo in todos:
        if todo['id'] == todo_id:
            todo['done'] = not todo['done']
            save_todos(todos)
            return jsonify(todo)
    return jsonify({'error': 'Элемент не найден'}), 404

@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    todos = load_todos()
    todos = [todo for todo in todos if todo['id'] != todo_id]
    save_todos(todos)
    return jsonify({'success': True})


PLANS_FILE = 'plans.json'

def load_plans():
    if os.path.exists(PLANS_FILE):
        with open(PLANS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def save_plans(plans):
    with open(PLANS_FILE, 'w', encoding='utf-8') as f:
        json.dump(plans, f, ensure_ascii=False, indent=2)


@app.route('/api/plans', methods=['GET'])
def get_plans():
    return jsonify(load_plans())


@app.route('/api/plans', methods=['POST'])
def add_plan():
    data = request.get_json()
    if not data or 'date' not in data:
        return jsonify({'error': 'Не указана дата'}), 400

    plans = load_plans()
    plans.append(data)
    save_plans(plans)
    return jsonify(data), 201


@app.route('/api/plans/<int:index>', methods=['DELETE'])
def delete_plan(index):
    plans = load_plans()
    if index < 0 or index >= len(plans):
        return jsonify({'error': 'План не найден'}), 404

    plans.pop(index)
    save_plans(plans)
    return jsonify({'success': True})


@app.route('/api/forecast')
def get_forecast():
    city = request.args.get('city', 'Москва')
    date_str = request.args.get('date', None)

    try:
        api_key = os.getenv('WEATHER_API_KEY')
        if not api_key:
            return jsonify({'error': 'API ключ не настроен'}), 500

        url = f'https://api.openweathermap.org/data/2.5/forecast?q={city}&appid=bd5e378503939ddaee76f12ad7a97608&units=metric&lang=ru'
        response = requests.get(url, timeout=10)

        if response.status_code != 200:
            return jsonify({'error': 'Город не найден'}), 404

        data = response.json()

        if not date_str:
            return jsonify(data)

        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        forecast_list = []

        for item in data['list']:
            item_date = datetime.fromtimestamp(item['dt']).date()
            if item_date == target_date:
                forecast_list.append({
                    'time': datetime.fromtimestamp(item['dt']).strftime('%H:%M'),
                    'temp': round(item['main']['temp']),
                    'feels_like': round(item['main']['feels_like']),
                    'humidity': item['main']['humidity'],
                    'description': item['weather'][0]['description'],
                    'icon': item['weather'][0]['icon'],
                    'clouds': item['clouds']['all'],
                    'wind_speed': round(item['wind']['speed'])
                })

        if not forecast_list:
            return jsonify({'error': 'Нет данных для выбранной даты'}), 404

        temps = [f['temp'] for f in forecast_list]
        avg_temp = round(sum(temps) / len(temps))

        return jsonify({
            'date': date_str,
            'city': data['city']['name'],
            'avg_temp': avg_temp,
            'forecast': forecast_list
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500