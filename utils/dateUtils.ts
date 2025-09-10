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
    if (hour >= 5 && hour < 8) return `**Bình minh (05:00-08:00):** Ánh sáng yếu ớt, trời se lạnh, có thể có sương mù. Các NPC nông dân, phu khuân vác bắt đầu ngày làm việc. Chợ và cửa hàng đang dọn hàng. Thích hợp cho việc quan sát, phục kích kẻ địch rời thành, hoặc hành động lén lút.`;
    if (hour >= 8 && hour < 12) return `**Buổi sáng (08:00-12:00):** Trời sáng rõ, nắng ấm, tầm nhìn tốt. Đường phố và chợ đông đúc, các cửa tiệm, cơ quan hành chính đều mở cửa. Thời điểm tốt nhất để mua sắm, giao nhiệm vụ công khai, và thu thập thông tin. Các hành động mờ ám dễ bị phát hiện.`;
    if (hour >= 12 && hour < 14) return `**Buổi trưa (12:00-14:00):** Nắng có thể gay gắt, nhiệt độ cao nhất trong ngày. Nhiều NPC nghỉ trưa, các quán ăn và tửu điếm đông khách. Lính canh có thể lơ là hơn. Thời điểm tốt để tìm các NPC cụ thể tại các điểm ăn uống, nghỉ ngơi.`;
    if (hour >= 14 && hour < 18) return `**Buổi chiều (14:00-18:00):** Nắng dịu, không khí mát mẻ hơn. NPC tiếp tục công việc buổi chiều nhưng có thể đã mệt mỏi. Một số người bắt đầu tan làm và trở về nhà. Ánh sáng yếu dần về cuối buổi, tạo điều kiện cho các hoạt động cần che giấu.`;
    if (hour >= 18 && hour < 20) return `**Hoàng hôn (18:00-20:00):** Ánh sáng vàng cam, bóng tối dài ra. Đèn đuốc trong thành được thắp lên. Lính canh đổi gác. Các hoạt động giải trí về đêm như tửu điếm, kỹ viện bắt đầu nhộn nhịp. Thời điểm chuyển giao, lý tưởng cho các cuộc phục kích hoặc đột nhập.`;
    if (hour >= 20 && hour < 24) return `**Buổi tối (20:00-00:00):** Trời tối hẳn, đường phố vắng vẻ hơn. Hầu hết các cửa tiệm thông thường đã đóng cửa, chỉ còn các tụ điểm giải trí về đêm hoạt động. Các hoạt động của thế giới ngầm, giao dịch mờ ám diễn ra. Nguy cơ bị tấn công trên đường vắng cao hơn.`;
    return `**Nửa đêm (00:00-05:00):** Trời tối đen như mực, tĩnh lặng. Hầu hết mọi người đã ngủ say, chỉ có lính canh tuần tra và các sinh vật bóng đêm hoạt động. Đây là thời điểm nguy hiểm nhất nhưng cũng là lý tưởng nhất cho các hành động đột nhập, ám sát hoặc yêu cầu sự lén lút tuyệt đối.`;
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