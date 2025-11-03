import React from 'react';
import OffCanvasPanel from '@/components/ui/OffCanvasPanel';

interface FunctionFilterLibraryProps {
  isOpen: boolean;
  onClose: () => void;
}

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-6">
        <h3 className="text-lg font-semibold text-indigo-300 border-b border-gray-600 pb-2 mb-3">{title}</h3>
        <div className="space-y-4 text-sm">{children}</div>
    </div>
);

const Entry: React.FC<{ syntax: string, description: string, example: string }> = ({ syntax, description, example }) => (
    <div>
        <p className="font-mono text-cyan-300 bg-gray-800 p-2 rounded-md">{syntax}</p>
        <p className="text-gray-300 mt-1 pl-2">{description}</p>
        <p className="text-xs text-gray-400 italic mt-1 pl-2">Ví dụ: <code className="bg-gray-800 p-1 rounded">{example}</code></p>
    </div>
);


const FunctionFilterLibrary: React.FC<FunctionFilterLibraryProps> = ({ isOpen, onClose }) => {
    return (
        <OffCanvasPanel isOpen={isOpen} onClose={onClose} title="Thư viện Hàm & Bộ lọc Đạo-Script">
            <div className="text-gray-200">
                <p className="mb-4 text-sm">Sử dụng các bộ lọc sau dấu gạch đứng `|` để định dạng dữ liệu. Bạn có thể nối nhiều bộ lọc với nhau.</p>

                <Section title="Logic Điều Khiển Luồng">
                    <Entry 
                        syntax="{% if condition %}...{% else %}...{% endif %}" 
                        description="Hiển thị nội dung khác nhau dựa trên một điều kiện. Điều kiện có thể là một biến (vd: knowledgeBase.playerStats.isInCombat) hoặc một phép so sánh (vd: knowledgeBase.playerStats.currency > 100)."
                        example={`{% if knowledgeBase.playerStats.isInCombat %} Đang chiến đấu! {% else %} Đang yên bình. {% endif %}`} 
                    />
                     <Entry 
                        syntax="{% for item in array %}...{{ item.property }}...{% endfor %}" 
                        description="Lặp qua từng phần tử trong một mảng (vd: knowledgeBase.inventory) và hiển thị nội dung cho mỗi phần tử. Biến 'item' (bạn có thể đặt tên khác) sẽ chứa phần tử hiện tại trong vòng lặp."
                        example={`{% for vat_pham in knowledgeBase.inventory %} - {{ vat_pham.name }} {% endfor %}`} 
                    />
                </Section>

                <Section title="Hàm Truy Vấn Dữ Liệu">
                    <p className="text-xs text-gray-400 mb-2">Các loại thực thể ('entityType') hợp lệ: 'npc', 'item', 'quest', 'location', 'faction', 'yeuThu', 'wife', 'slave', 'prisoner'.</p>
                    <Entry 
                        syntax={`query.find('{"entityType": "loại", "conditions": {"trường": "giá_trị"}}')`}
                        description="Tìm và trả về thực thể ĐẦU TIÊN khớp với điều kiện. Trả về 'null' nếu không tìm thấy."
                        example={`{{ query.find('{"entityType": "npc", "conditions": {"name": "Lý Tiêu Dao"}}').realm }}`} 
                    />
                    <Entry 
                        syntax={`query.filter('{"entityType": "loại", "conditions": {"trường": "giá_trị"}}')`}
                        description="Tìm và trả về một MẢNG chứa TẤT CẢ các thực thể khớp điều kiện. Dùng kết hợp với vòng lặp 'for'."
                        example={`{% for item in query.filter('{"entityType": "item", "conditions": {"rarity": "Thần Thoại"}}') %}- {{ item.name }}{% endfor %}`} 
                    />
                     <Entry 
                        syntax={`query.current('{"entityType": "loại"}')`}
                        description="Một hàm tắt tiện lợi để lấy thực thể hiện tại trong ngữ cảnh. Hiện chỉ hỗ trợ 'location'."
                        example={`{{ query.current('{"entityType": "location"}').name }}`} 
                    />
                </Section>

                <Section title="Bộ lọc Chuỗi (String)">
                    <Entry syntax="{{ biến | uppercase }}" description="Chuyển toàn bộ chuỗi thành chữ IN HOA." example="{{ 'hello world' | uppercase }} → HELLO WORLD" />
                    <Entry syntax="{{ biến | lowercase }}" description="Chuyển toàn bộ chuỗi thành chữ thường." example="{{ 'HELLO WORLD' | lowercase }} → hello world" />
                    <Entry syntax="{{ biến | capitalize }}" description="Chỉ viết hoa chữ cái đầu tiên của chuỗi." example="{{ 'hello WORLD' | capitalize }} → Hello world" />
                    <Entry syntax="{{ biến | truncate:số_ký_tự }}" description="Cắt ngắn chuỗi và thêm '...' nếu nó dài hơn số ký tự cho phép. Mặc định là 50." example="{{ 'chuỗi rất dài' | truncate:10 }} → chuỗi rất..." />
                </Section>

                <Section title="Bộ lọc Mảng (Array)">
                     <Entry syntax="{{ mảng | random }}" description="Chọn một phần tử ngẫu nhiên từ một mảng." example="{{ ['táo', 'lê', 'cam'] | random }} → 'lê' (ngẫu nhiên)" />
                     <Entry syntax="{{ mảng | join:'ký_tự_nối' }}" description="Nối các phần tử của mảng thành một chuỗi, phân cách bởi ký tự cho trước. Mặc định là ', '." example="{{ ['a', 'b', 'c'] | join:' - ' }} → 'a - b - c'" />
                     <Entry syntax="{{ mảng_hoặc_chuỗi | length }}" description="Trả về số lượng phần tử trong mảng hoặc ký tự trong chuỗi." example="{{ ['a', 'b'] | length }} → 2" />
                </Section>
                
                <Section title="Bộ lọc Toán học (Math)">
                    <Entry syntax="{{ số | add:số_lượng }}" description="Cộng thêm một số. Mặc định là 1." example="{{ 10 | add:5 }} → 15" />
                    <Entry syntax="{{ số | subtract:số_lượng }}" description="Trừ đi một số. Mặc định là 1." example="{{ 10 | subtract:3 }} → 7" />
                </Section>
                
                <Section title="Bộ lọc Logic">
                     <Entry syntax="{{ biến | default:'giá_trị_mặc_định' }}" description="Hiển thị giá trị mặc định nếu biến không tồn tại (null, undefined, hoặc rỗng)." example="{{ biến_không_tồn_tại | default:'Không có' }} → 'Không có'" />
                </Section>
            </div>
        </OffCanvasPanel>
    );
};

export default FunctionFilterLibrary;