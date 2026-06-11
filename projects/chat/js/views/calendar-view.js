function pad(n) {
  return String(n).padStart(2, '0');
}

export function toLocalDateStr(isoStr) {
  if (!isoStr) return null;
  const date = new Date(isoStr);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatCalendarTime(isoStr) {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function renderCalendarGrid({
  gridEl,
  titleEl,
  currentYear,
  currentMonth,
  selectedDateStr,
  today,
  getEventsForDate,
  onSelectDate,
}) {
  gridEl.innerHTML = '';
  titleEl.textContent = `${currentYear}년 ${currentMonth + 1}월`;

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';
    cell.setAttribute('role', 'gridcell');

    let year;
    let month;
    let day;
    let isOtherMonth = false;

    if (i < firstDay) {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      day = daysInPrevMonth - firstDay + i + 1;
      month = prevMonth;
      year = prevYear;
      isOtherMonth = true;
    } else if (i >= firstDay + daysInMonth) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      day = i - firstDay - daysInMonth + 1;
      month = nextMonth;
      year = nextYear;
      isOtherMonth = true;
    } else {
      day = i - firstDay + 1;
      month = currentMonth;
      year = currentYear;
    }

    const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;

    if (isOtherMonth) cell.classList.add('other-month');
    if (dateStr === todayStr) cell.classList.add('today');
    if (dateStr === selectedDateStr) cell.classList.add('selected');

    const dayNum = document.createElement('div');
    dayNum.className = 'day-number';
    dayNum.textContent = day;
    cell.appendChild(dayNum);

    const events = getEventsForDate(dateStr);
    if (events.length > 0) {
      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'event-dots';

      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        events.slice(0, 3).forEach((event) => {
          const dot = document.createElement('span');
          dot.className = `event-dot${event.status === 'private' ? ' private' : ''}`;
          dotsContainer.appendChild(dot);
        });
      } else {
        events.slice(0, 2).forEach((event) => {
          const preview = document.createElement('span');
          preview.className = `event-preview${event.status === 'private' ? ' private' : ''}`;
          preview.textContent = event.title;
          dotsContainer.appendChild(preview);
        });
        if (events.length > 2) {
          const more = document.createElement('span');
          more.className = 'event-preview';
          more.textContent = `+${events.length - 2}개 더`;
          dotsContainer.appendChild(more);
        }
      }
      cell.appendChild(dotsContainer);
    }

    cell.addEventListener('click', () => {
      onSelectDate(dateStr);
    });

    gridEl.appendChild(cell);
  }
}

export function renderCalendarEventList({ titleEl, listEl, dateStr, events }) {
  const date = new Date(`${dateStr}T00:00:00`);
  titleEl.textContent = `${date.getMonth() + 1}월 ${date.getDate()}일 일정`;

  if (events.length === 0) {
    listEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p class="empty-state-title">일정이 없습니다</p></div>';
    return;
  }

  listEl.innerHTML = '';
  events.forEach((event) => {
    const item = document.createElement('a');
    item.className = 'event-list-item';
    item.href = `/event-detail.html?id=${event.id}`;

    const dot = document.createElement('div');
    dot.className = `event-list-item-dot${event.status === 'private' ? ' private' : ''}`;

    const info = document.createElement('div');
    info.className = 'event-list-item-info';

    const titleSpan = document.createElement('div');
    titleSpan.className = 'event-list-item-title';
    titleSpan.textContent = event.title;

    const meta = document.createElement('div');
    meta.className = 'event-list-item-meta';
    if (event.startTime) {
      meta.textContent = `${formatCalendarTime(event.startTime)}${event.endTime ? ` ~ ${formatCalendarTime(event.endTime)}` : ''} · 참여자 ${event.participantCount}명`;
    } else {
      meta.textContent = `시간 미정 · 참여자 ${event.participantCount}명`;
    }

    info.appendChild(titleSpan);
    info.appendChild(meta);
    item.appendChild(dot);
    item.appendChild(info);

    if (event.hasChatRoom) {
      const chatIcon = document.createElement('span');
      chatIcon.textContent = '💬';
      chatIcon.title = '채팅방 있음';
      item.appendChild(chatIcon);
    }

    listEl.appendChild(item);
  });
}
