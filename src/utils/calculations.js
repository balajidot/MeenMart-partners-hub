import { PROOF_EXPIRY_MS } from './constants';

/**
 * Returns YYYY-MM-DD in local timezone (IST).
 * Handles Date objects, timestamps, or date strings safely.
 */
export function getLocalDateStr(d = new Date()) {
  if (!d) return '';
  if (typeof d === 'string') {
    const match = d.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function pruneExpiredProofs(store) {
  const now = Date.now();
  const prune = (list) =>
    (list || []).map((item) => {
      if (item.proof && item.proofAddedAt && now - item.proofAddedAt > PROOF_EXPIRY_MS) {
        return { ...item, proof: null, proofAddedAt: null };
      }
      return item;
    });

  return {
    ...store,
    tasks:    prune(store.tasks || []),
    expenses: prune(store.expenses || []),
    worklogs: prune(store.worklogs || []),
    messages: prune(store.messages || []),
  };
}

export function compressImage(file, maxKB = 80) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided'));
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxDim = 800;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Canvas context unavailable'));
          }
          ctx.drawImage(img, 0, 0, width, height);
          let quality = 0.8;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          while (dataUrl.length > maxKB * 1024 * 1.37 && quality > 0.15) {
            quality = Math.max(0.1, Number((quality - 0.1).toFixed(2)));
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export function getProofExpiryText(addedAt) {
  if (!addedAt) return '';
  const remaining = PROOF_EXPIRY_MS - (Date.now() - addedAt);
  if (remaining <= 0) return 'Expired';
  const hrs = Math.floor(remaining / 3600000);
  if (hrs < 1) return '< 1 hour left';
  return `${hrs} hours left`;
}

/**
 * Parses a dueTime string (e.g. '09:30 AM', '14:00', '1:00 PM') and returns a Date object.
 */
function parseDueTime(dueTimeStr, dateStr = getLocalDateStr()) {
  if (!dueTimeStr || typeof dueTimeStr !== 'string') return null;
  const match = dueTimeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([APap][Mm]))?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  const dateParts = dateStr.split('-');
  if (dateParts.length === 3) {
    const d = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10), hours, minutes, 0);
    return d;
  }
  return null;
}

/**
 * Computes deadline status for a task: 'overdue', 'due_soon', 'normal', or 'completed'
 */
export function getTaskDeadlineStatus(task) {
  if (!task) return null;
  if (task.status === 'completed' || task.s === 'done') {
    return { status: 'completed', label: 'Mudinjidhu', time: task.dueTime || null };
  }

  const rawDate = task.dueDateTime || task.dueAt || task.createdAt || getLocalDateStr();
  const dateStr = getLocalDateStr(rawDate);
  const dueTime = task.dueTime;

  if (!dueTime) return null;

  const dueDate = parseDueTime(dueTime, dateStr);
  if (!dueDate || isNaN(dueDate.getTime())) {
    return { status: 'normal', label: `Deadline: ${dueTime}`, time: dueTime };
  }

  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMs < 0) {
    const minsAgo = Math.abs(diffMins);
    const timeAgoStr = minsAgo < 60 ? `${minsAgo}m munnadi` : `${Math.floor(minsAgo / 60)}h munnadi`;
    return {
      status: 'overdue',
      label: `🚨 Overdue (${dueTime})`,
      detail: `Deadline mudinjidhu (${timeAgoStr})`,
      time: dueTime,
    };
  } else if (diffMs <= 60 * 60 * 1000) {
    return {
      status: 'due_soon',
      label: `⏳ Due Soon (${diffMins}m)`,
      detail: `Innum ${diffMins} nimisham dhaan irukku!`,
      time: dueTime,
    };
  } else {
    return {
      status: 'normal',
      label: `⏱️ ${dueTime}-kulla`,
      detail: `${dueTime}-kulla mudikanum`,
      time: dueTime,
    };
  }
}

