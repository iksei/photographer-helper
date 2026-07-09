Веб-приложение для планирования съёмок, расчёта параметров и управления снаряжением.
- Прогноз погоды на выбранную дату по городу (OpenWeatherMap)
- Расчёт глубины резкости (ГРИП) по диафрагме, фокусному и расстоянию
- Калькулятор выдержки по правилу Sunny 16
- Чек-лист снаряжения с отметкой выполнения
- Планирование съёмок с датой, локацией и заметками

## Технологии
- Python 3.8+
- Flask
- HTML + CSS + JavaScript
- OpenWeatherMap API
- JSON (хранение данных)

## Установка и запуск
Клонируйте репозиторий:
git clone https://github.com/iksei/photographer-helper.git
cd photographer-helper

Создайте виртуальное окружение:
python -m venv venv
venv\Scripts\activate # Windows
source venv/bin/activate # Mac/Linux

Установите зависимости:
pip install -r requirements.txt

Настройте API ключ OpenWeatherMap:
1. Зарегистрируйтесь на openweathermap.org
2. Получите бесплатный API ключ
3. Создайте в корне проекта файл `.env`
4. Добавьте в него строку: WEATHER_API_KEY=ваш_ключ
   
Запустите приложение: python main.py
