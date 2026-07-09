flatpickr("#planDate", {
    dateFormat: "d.m.Y",
    minDate: "today",
    locale: "ru",
    placeholder: "Выберите дату",
    onChange: function(selectedDates, dateStr, instance) {
        if (dateStr) {
            const parts = dateStr.split('.');
            const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            getWeatherForDate(formattedDate);
        }
    }
});

document.getElementById('planCity').addEventListener('input', function() {
    const dateStr = document.getElementById('planDate').value;
    if (dateStr) {
        const parts = dateStr.split('.');
        const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        getWeatherForDate(formattedDate);
    }
});

async function loadPlans() {
    try {
        const response = await fetch('/api/plans');
        const plans = await response.json();
        renderPlans(plans);
    } catch (error) {
        console.error('Ошибка загрузки планов:', error);
    }
}

function renderPlans(plans) {
    const container = document.getElementById('plansList');

    if (!plans || plans.length === 0) {
        container.innerHTML = '<p class="plans-empty">Нет запланированных съёмок</p>';
        return;
    }

    let html = '';
    plans.sort((a, b) => new Date(a.date) - new Date(b.date));

    plans.forEach((plan, index) => {
        html += `
            <div class="plan-item" data-index="${index}">
                <div class="plan-info">
                    <div class="plan-date">${plan.date}</div>
                    <div class="plan-details">
                        <strong>${plan.type}</strong> · ${plan.location || 'Место не указано'}
                        ${plan.city ? ` · 📍 ${plan.city}` : ''}  <!-- 👈 НОВОЕ -->
                    </div>
                    <div class="plan-photographer">📷 ${plan.photographer || 'Аноним'}</div>
                    ${plan.notes ? `<div class="plan-notes">📝 ${plan.notes}</div>` : ''}
                </div>
                <button class="plan-delete-btn" data-index="${index}">✕</button>
            </div>
        `;
    });
    container.innerHTML = html;

    container.querySelectorAll('.plan-delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            deletePlan(index);
        });
    });
}

async function getWeatherForDate(date) {
    const cityInput = document.getElementById('planCity');
    const city = cityInput.value.trim() || 'Москва';

    const weatherBlock = document.getElementById('weatherBlock');
    const forecastList = document.getElementById('weatherForecastList');
    const weatherTitle = document.getElementById('weatherTitle');

    console.log(`📤 Отправка запроса: /api/forecast?city=${encodeURIComponent(city)}&date=${date}`);

    try {
        const response = await fetch(`/api/forecast?city=${encodeURIComponent(city)}&date=${date}`);
        const data = await response.json();

        console.log('📥 Ответ сервера:', data);

        if (data.error) {
            console.warn('⚠️ Ошибка от сервера:', data.error);
            weatherBlock.style.display = 'none';
            return;
        }

        weatherBlock.style.display = 'block';
        weatherTitle.textContent = `🌤️ Прогноз погоды в ${data.city} на ${data.date}`;

        let html = `<p style="font-weight: bold; margin-bottom: 10px;">Средняя температура: ${data.avg_temp}°C</p>`;
        html += '<div class="forecast-hours">';
        data.forecast.forEach(item => {
            let emoji = '☀️';
            if (item.description.includes('облачно')) emoji = '☁️';
            if (item.description.includes('дождь')) emoji = '🌧️';
            if (item.description.includes('снег')) emoji = '❄️';
            if (item.description.includes('пасмурно')) emoji = '☁️';
            if (item.description.includes('ясно')) emoji = '☀️';

            html += `
                <div class="forecast-hour">
                    <span class="forecast-time">${item.time}</span>
                    <span class="forecast-icon">${emoji}</span>
                    <span class="forecast-temp">${item.temp}°C</span>
                    <span class="forecast-desc">${item.description}</span>
                </div>
            `;
        });
        html += '</div>';
        forecastList.innerHTML = html;

    } catch (error) {
        console.error('❌ Ошибка получения погоды:', error);
        weatherBlock.style.display = 'none';
    }
}

document.getElementById('savePlanBtn').addEventListener('click', async function() {
    const photographer = document.getElementById('planPhotographer').value.trim();
    const date = document.getElementById('planDate').value.trim();
    const city = document.getElementById('planCity').value.trim();
    const type = document.getElementById('planType').value;
    const location = document.getElementById('planLocation').value.trim();
    const notes = document.getElementById('planNotes').value.trim();

    if (!photographer) {
        alert('Пожалуйста, укажите имя фотографа');
        return;
    }

    if (!date) {
        alert('Пожалуйста, выберите дату съёмки');
        return;
    }

    const plan = {
        photographer,
        date,
        city: city || 'Не указано',
        type,
        location: location || 'Не указано',
        notes: notes || ''
    };

    try {
        const response = await fetch('/api/plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(plan)
        });

        if (response.ok) {
            document.getElementById('planPhotographer').value = '';
            document.getElementById('planDate').value = '';
            document.getElementById('planCity').value = '';
            document.getElementById('planLocation').value = '';
            document.getElementById('planNotes').value = '';
            document.getElementById('weatherBlock').style.display = 'none';
            loadPlans();
        } else {
            alert('Ошибка при сохранении плана');
        }
    } catch (error) {
        alert('Ошибка соединения с сервером');
    }
});

async function deletePlan(index) {
    if (!confirm('Удалить этот план?')) return;

    try {
        const response = await fetch(`/api/plans/${index}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadPlans();
        } else {
            alert('Ошибка при удалении');
        }
    } catch (error) {
        alert('Ошибка соединения с сервером');
    }
}

loadPlans();
