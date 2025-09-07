// src/utils/dateUtils.ts
// FIX: Correct import path for types
import { WorldDate } from '../types/index';

export const formatWorldDateToString = (date?: WorldDate): string => {
  if (!date) return 'Ngày không xác định';
  return `Ngày ${date.day}, Tháng ${date.month}, Năm ${date.year} - ${String(date.hour).padStart(2, '0')}:${String(date.minute).padStart(2, '0')}`;
};

export const worldDateToTotalMinutes = (date: WorldDate): number => {
    const minutes = date.minute || 0;
    const hours = date.hour || 0;
    const days = date.day || 1;
    const months = date.month || 1;
    const years = date.year || 1;
    return minutes + (hours * 60) + ((days - 1) * 24 * 60) + ((months - 1) * 30 * 24 * 60) + ((years - 1) * 360 * 24 * 60);
};

// FIX: Added missing function that is used elsewhere to calculate total days from a WorldDate object.
export const worldDateToTotalDays = (date: WorldDate): number => {
    return (date.year * 360) + ((date.month - 1) * 30) + date.day;
};

export const addDaysToWorldDate = (date: WorldDate, daysToAdd: number): WorldDate => {
    let newDate = { ...date };
    newDate.day += daysToAdd;
    while (newDate.day > 30) {
        newDate.day -= 30;
        newDate.month += 1;
        if (newDate.month > 12) {
            newDate.month -= 12;
            newDate.year += 1;
        }
    }
    return newDate;
};

export const getWorldDateDifferenceString = (startDate: WorldDate, endDate: WorldDate, currentDate: WorldDate): string => {
    const totalDaysStart = worldDateToTotalDays(startDate);
    const totalDaysEnd = worldDateToTotalDays(endDate);
    const totalDaysCurrent = worldDateToTotalDays(currentDate);

    if (totalDaysCurrent < totalDaysStart) {
        const daysUntil = totalDaysStart - totalDaysCurrent;
        return `Bắt đầu sau ${daysUntil} ngày`;
    } else if (totalDaysCurrent >= totalDaysStart && totalDaysCurrent <= totalDaysEnd) {
        const daysLeft = totalDaysEnd - totalDaysCurrent;
        return `Còn lại ${daysLeft} ngày`;
    } else {
        return `Đã kết thúc`;
    }
};

export const getSeason = (date: WorldDate): string => {
    const month = date.month;
    if (month >= 3 && month <= 5) return 'Mùa Xuân';
    if (month >= 6 && month <= 8) return 'Mùa Hạ';
    if (month >= 9 && month <= 11) return 'Mùa Thu';
    return 'Mùa Đông';
};

export const getTimeOfDayContext = (date: WorldDate): string => {
    const hour = date.hour;
    if (hour >= 5 && hour < 8) return `Bình minh đang lên, trời se lạnh. NPC thường thức dậy, chuẩn bị cho ngày mới.`;
    if (hour >= 8 && hour < 12) return `Trời sáng rõ, nắng ấm. NPC đang làm việc, các khu chợ và cửa hàng đông đúc.`;
    if (hour >= 12 && hour < 14) return `Giữa trưa, nắng gắt. Nhiều NPC nghỉ ngơi, quán ăn và tửu điếm đông khách.`;
    if (hour >= 14 && hour < 18) return `Buổi chiều, nắng dịu. NPC tiếp tục công việc, một số bắt đầu trở về nhà.`;
    if (hour >= 18 && hour < 20) return `Hoàng hôn, trời tối dần. Đèn đuốc được thắp lên. NPC tan làm, các hoạt động giải trí ban đêm bắt đầu.`;
    if (hour >= 20 && hour < 24) return `Đêm khuya, đường phố vắng vẻ. Hầu hết NPC đã về nhà nghỉ ngơi. Các hoạt động mờ ám có thể diễn ra.`;
    return `Canh khuya, trời tối đen như mực. Hầu hết mọi người đã ngủ say. Đây là thời điểm nguy hiểm nhất.`;
};

export const parseDurationString = (durationStr: string): { days: number } => {
    if (!durationStr) return { days: 0 };
    const parts = durationStr.split(/\s+/);
    const value = parseInt(parts[0], 10);
    const unit = parts[1] || 'ngày';

    if (isNaN(value)) return { days: 0 };

    if (unit.startsWith('ngày')) return { days: value };
    if (unit.startsWith('tháng')) return { days: value * 30 };
    if (unit.startsWith('năm')) return { days: value * 360 };
    if (unit.startsWith('giờ')) return { days: value / 24 };
    if (unit.startsWith('phút')) return { days: value / (24 * 60) };

    return { days: 0 };
};
