use crate::models::read_range::ReadRange;

pub struct RangeCalculator;

impl RangeCalculator {
    pub fn calculate_read_characters(ranges: Vec<ReadRange>) -> i64 {
        if ranges.is_empty() {
            return 0;
        }

        let mut sorted_ranges = ranges;
        sorted_ranges.sort_by_key(|r| r.start_position);

        let mut merged_ranges = Vec::new();
        let mut current_start = sorted_ranges[0].start_position;
        let mut current_end = sorted_ranges[0].end_position;

        for range in sorted_ranges.iter().skip(1) {
            if range.start_position <= current_end {
                current_end = current_end.max(range.end_position);
            } else {
                merged_ranges.push((current_start, current_end));
                current_start = range.start_position;
                current_end = range.end_position;
            }
        }
        merged_ranges.push((current_start, current_end));

        merged_ranges.iter().map(|(start, end)| end - start).sum()
    }

    pub fn is_position_read(position: i64, ranges: &[ReadRange]) -> bool {
        ranges.iter().any(|r| position >= r.start_position && position < r.end_position)
    }

    pub fn get_unread_ranges(total_length: i64, read_ranges: Vec<ReadRange>) -> Vec<(i64, i64)> {
        if read_ranges.is_empty() {
            return vec![(0, total_length)];
        }

        let mut sorted_ranges = read_ranges;
        sorted_ranges.sort_by_key(|r| r.start_position);

        let mut unread = Vec::new();
        let mut current_pos = 0;

        for range in sorted_ranges {
            if range.start_position > current_pos {
                unread.push((current_pos, range.start_position));
            }
            current_pos = current_pos.max(range.end_position);
        }

        if current_pos < total_length {
            unread.push((current_pos, total_length));
        }

        unread
    }
}
