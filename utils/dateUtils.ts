// src/utils/dateUtils.ts
import { WorldDate } from '../types';

/**
 * Parses a duration string (e.g., "10 ngày", "2 tháng") into a total number of days.
 * @param durationStr The string to parse.
 * @returns An object containing the total number of days.
 */
export const parseDurationString = (durationStr: string): { days: number } => {
    let totalDays = 0;
    const parts = durationStr.toLowerCase().split(/[\s,]+/);

    for (let i = 0; i < parts.length - 1; i++) {
        const value = parseInt(parts[i], 10);
        if (!isNaN(value)) {
            const unit = parts[i + 1];
            if (unit.startsWith('ngày')) {
                totalDays += value;
            } else if (unit.startsWith('tháng')) {
                totalDays += value * 30;
            } else if (unit.startsWith('năm')) {
                totalDays += value * 360;
            }
        }
    }
    return { days: totalDays };
};

/**
 * Adds a specified number of days to a WorldDate object, handling month and year overflows.
 * @param date The starting WorldDate.
 * @param daysToAdd The number of days to add.
 * @returns The new WorldDate object.
 */
export const addDaysToWorldDate = (date: WorldDate, daysToAdd: number): WorldDate => {
    const newDate = { ...date };
    newDate.day += daysToAdd;

    while (newDate.day > 30) {
        newDate.day -= 30;
        newDate.month += 1;
        if (newDate.month > 12) {
            newDate.month = 1;
            newDate.year += 1;
        }
    }
    return newDate;
};


/**
 * Converts a WorldDate to a total number of days since year 0, month 0, day 0 for calculations.
 * This function is now exported for wider use.
 * @param date The WorldDate to convert.
 * @returns The total number of days.
 */
export const worldDateToTotalDays = (date: WorldDate): number => {
    return (date.year * 360) + ((date.month - 1) * 30) + date.day;
};

/**
 * Converts a WorldDate to a total number of minutes since year 1, month 1, day 1.
 * This is used for precise time difference calculations.
 * @param date The WorldDate to convert.
 * @returns The total number of minutes.
 */
export const worldDateToTotalMinutes = (date: WorldDate): number => {
    let totalMinutes = 0;
    totalMinutes += date.year * 360 * 24 * 60;
    totalMinutes += (date.month - 1) * 30 * 24 * 60;
    totalMinutes += (date.day - 1) * 24 * 60;
    totalMinutes += date.hour * 60;
    totalMinutes += date.minute;
    return totalMinutes;
};


/**
 * Calculates the difference in days between two WorldDate objects.
 * This function is now exported for wider use.
 * @param date1 The first date.
 * @param date2 The second date.
 * @returns The absolute difference in days.
 */
export const daysBetween = (date1: WorldDate, date2: WorldDate): number => {
    return Math.abs(worldDateToTotalDays(date1) - worldDateToTotalDays(date2));
};

/**
 * Generates a human-readable string describing the time difference for an event relative to the current date.
 * @param startDate The event's start date.
 * @param endDate The event's end date.
 * @param currentDate The current game date.
 * @returns A formatted string (e.g., "Sắp diễn ra trong X ngày", "Đang diễn ra, còn Y ngày").
 */
export const getWorldDateDifferenceString = (startDate: WorldDate, endDate: WorldDate, currentDate: WorldDate): string => {
    const totalDaysStart = worldDateToTotalDays(startDate);
    const totalDaysEnd = worldDateToTotalDays(endDate);
    const totalDaysCurrent = worldDateToTotalDays(currentDate);

    if (totalDaysCurrent < totalDaysStart) {
        const daysUntil = daysBetween(currentDate, startDate);
        return `Bắt đầu sau ${daysUntil} ngày`;
    } else if (totalDaysCurrent >= totalDaysStart && totalDaysCurrent <= totalDaysEnd) {
        const daysRemaining = daysBetween(currentDate, endDate);
        return `Kết thúc sau ${daysRemaining} ngày`;
    } else { // totalDaysCurrent > totalDaysEnd
        const daysAgo = daysBetween(currentDate, endDate);
        return `Đã kết thúc ${daysAgo} ngày trước`;
    }
};

/**
 * Formats a WorldDate object into a readable string.
 * @param date The WorldDate object.
 * @returns A formatted string e.g., "Ngày 1, Tháng 1, Năm 1 - 08:00".
 */
export const formatWorldDateToString = (date: WorldDate): string => {
  if (!date) return 'Không rõ';
  const hour = String(date.hour).padStart(2, '0');
  const minute = String(date.minute).padStart(2, '0');
  return `Ngày ${date.day}, Tháng ${date.month}, Năm ${date.year} - ${hour}:${minute}`;
};

/**
 * Gets the current season based on the month.
 * Assumes a 12-month year.
 * @param date The WorldDate object.
 * @returns A string representing the season in Vietnamese.
 */
export const getSeason = (date: WorldDate): string => {
  const month = date.month;
  if (month >= 1 && month <= 3) return "Mùa Xuân";
  if (month >= 4 && month <= 6) return "Mùa Hạ";
  if (month >= 7 && month <= 9) return "Mùa Thu";
  return "Mùa Đông"; // Months 10, 11, 12
};

/**
 * Provides a detailed context string for the current time of day based on the hour.
 * This is used to guide the AI's narration and event generation.
 * @param date The WorldDate object.
 * @returns A detailed, multi-line string describing the current time of day's context.
 */
export const getTimeOfDayContext = (date: WorldDate): string => {
  const hour = date.hour;

  if (hour >= 4 && hour < 6) {
    return `Rạng Đông (04:00 – 06:00)
Ánh sáng & môi trường: Ánh sáng yếu, sương mờ hoặc hơi ẩm xuất hiện, tầm nhìn giảm đáng kể. Nhiệt độ thấp, mặt đất còn ướt đẫm.
Hoạt động con người/NPC: Một số ít NPC dậy sớm (nông dân, người đánh cá, lính gác thay ca). Phần lớn dân cư vẫn ngủ. An ninh giảm, nhưng vẫn có người quan sát rải rác.
Nguy cơ & cơ hội: Lén lút có hiệu quả cao nhờ ánh sáng mờ, nhưng nguy hiểm từ sinh vật tự nhiên hoặc các yếu tố môi trường (thú dữ, khí hậu, yêu ma) tăng.
Sự kiện đặc biệt: Đây là lúc thích hợp để bắt đầu nhiệm vụ gắn với khởi đầu ngày mới, quan sát thay đổi khí hậu, hoặc sự kiện liên quan đến nghi lễ bình minh.`;
  } else if (hour >= 6 && hour < 10) {
    return `Buổi Sáng (06:00 – 10:00)
Ánh sáng & môi trường: Mặt trời mọc, ánh sáng rõ ràng, tầm nhìn xa. Nhiệt độ ổn định, bầu không khí trong lành.
Hoạt động con người/NPC: Khu vực dân cư nhộn nhịp dần, chợ mở cửa, thương nhân đi lại, học sinh và lao động bắt đầu công việc. Hệ thống hành chính hoặc pháp luật hoạt động mạnh nhất.
Nguy cơ & cơ hội: Trộm cắp khó khăn do đám đông cảnh giác. Tuy nhiên, cơ hội buôn bán, thương lượng, trao đổi thông tin rất thuận lợi.
Sự kiện đặc biệt: Nhiều nhiệm vụ công khai (lễ hội, giao thương, họp hội đồng, huấn luyện) chỉ mở vào giờ này.`;
  } else if (hour >= 10 && hour < 14) {
    return `Buổi Trưa (10:00 – 14:00)
Ánh sáng & môi trường: Ánh sáng gay gắt, nhiệt độ cao, dễ gây mệt mỏi hoặc suy giảm thể lực. Bóng đổ ngắn, ít chỗ trú ẩn.
Hoạt động con người/NPC: Một số NPC tạm nghỉ, số khác vẫn hoạt động bận rộn. Lính gác tại khu vực trọng yếu tập trung đông hơn.
Nguy cơ & cơ hội: Khó che giấu hành động do ánh sáng gắt và khu vực đông đúc. Tuy nhiên, nhiều NPC trở nên kém tập trung hoặc mệt mỏi, tạo ra khe hở cho những hành động nhỏ lẻ.
Sự kiện đặc biệt: Nhiệm vụ liên quan đến thử thách sức chịu đựng, vận chuyển hàng hóa hoặc hành trình xa thường khởi đầu vào buổi trưa.`;
  } else if (hour >= 14 && hour < 18) {
    return `Buổi Chiều (14:00 – 18:00)
Ánh sáng & môi trường: Ánh sáng dịu dần, nhiệt độ hạ xuống, bóng dài ra, thuận lợi hơn cho việc quan sát hoặc theo dõi.
Hoạt động con người/NPC: Đây là thời điểm xã hội hoạt động sôi nổi nhất: thương nhân giao dịch, học trò tan lớp, đoàn lữ hành khởi hành hoặc kết thúc hành trình.
Nguy cơ & cơ hội: Tập trung đông người tạo cơ hội tiếp xúc, mở rộng quan hệ, nhưng cũng là thời điểm dễ bị lộ nếu hành động phi pháp.
Sự kiện đặc biệt: Các sự kiện cộng đồng (biểu diễn, phiên chợ, cuộc họp, đấu trường) thường diễn ra vào lúc này.`;
  } else if (hour >= 18 && hour < 20) {
    return `Hoàng Hôn (18:00 – 20:00)
Ánh sáng & môi trường: Trời tối dần, ánh sáng chuyển sang gam vàng đỏ, tầm nhìn bắt đầu hạn chế. Gió lạnh, bóng tối tạo cảm giác bất an.
Hoạt động con người/NPC: Dân cư rút về nhà, chợ đóng cửa, một số tụ điểm giải trí hoặc quán rượu bắt đầu nhộn nhịp. Lính gác thay ca, dễ có sơ hở.
Nguy cơ & cơ hội: Thời điểm lý tưởng để hành động lén lút, theo dõi hoặc tiếp cận mục tiêu. Sinh vật bóng tối hoặc kẻ xấu manh nha hoạt động.
Sự kiện đặc biệt: Một số nghi thức, lễ hội, hoặc hoạt động tâm linh liên quan đến thời khắc giao thoa ngày–đêm.`;
  } else if (hour >= 20 && hour < 24) {
    return `Ban Đêm (20:00 – 00:00)
Ánh sáng & môi trường: Ánh sáng mờ nhạt, phụ thuộc vào đèn đuốc, trăng hoặc nguồn sáng nhân tạo. Khu vực tối tăm nhiều, dễ che giấu hành động.
Hoạt động con người/NPC: Đa số dân cư ngủ nghỉ, chỉ còn lại lính gác, kẻ phi pháp, hoặc người có công việc đặc thù. Quán rượu, ổ cờ bạc, tụ điểm bí mật hoạt động mạnh.
Nguy cơ & cơ hội: Rủi ro cao do kẻ thù ẩn danh hoạt động, nhưng cũng là khung giờ dễ xâm nhập, cướp bóc hoặc thương lượng bí mật.
Sự kiện đặc biệt: Nhiệm vụ ám sát, trao đổi ngầm, buôn bán hàng cấm hoặc triệu hồi thường chỉ diễn ra vào thời điểm này.`;
  } else { // Covers 00:00 - 03:59
    return `Nửa Đêm (00:00 – 04:00)
Ánh sáng & môi trường: Bóng tối bao trùm, ánh sáng yếu nhất, yên tĩnh gần như tuyệt đối. Nhiệt độ thấp, nhiều khu vực hoang vắng.
Hoạt động con người/NPC: Dân cư hoàn toàn rút vào trong nhà. Lính gác mệt mỏi, thiếu cảnh giác. Xuất hiện nhiều thế lực ngầm hoặc thực thể phi tự nhiên.
Nguy cơ & cơ hội: Nguy hiểm ở mức cao nhất, khả năng bị tấn công bất ngờ hoặc gặp thực thể mạnh vượt trội. Tuy nhiên, cũng là lúc dễ đột nhập nhất vào khu vực cấm.
Sự kiện đặc biệt: Các sự kiện hiếm (nghi thức tà giáo, hiện tượng siêu nhiên, mở cổng, biến cố định mệnh) thường chỉ kích hoạt trong khung giờ này.`;
  }
};