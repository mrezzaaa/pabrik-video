# Claude Skills — Bộ sưu tập skill cho Claude Code

Gom ngày 09/11/2026 cho Bui Code. Tổng **84 skill** (611 file, ~6,5 MB), chia 3 nhóm. Tất cả đều là skill chuẩn Claude Code (thư mục có file `SKILL.md`): copy vào máy là dùng được.

## Cách cài (chọn 1 trong 3)

1. **Copy tay (chắc nhất):** tải thư mục này về, copy thư mục skill cần dùng vào `~/.claude/skills/`, khởi động lại Claude Code, gõ `/skills` để kiểm tra.
2. **Lệnh npx:** `npx skills add <đường dẫn tới thư mục skill>` — vd `npx skills add ./learn-mcp`.
3. **Plugin marketplace (chỉ 2 nhóm dưới):** Marketing Skills — `/plugin marketplace add coreyhaines31/marketingskills` rồi `/plugin install marketing-skills@marketingskills`; Superpowers — tìm trong marketplace chính thức của Claude Code, gõ "superpowers" rồi cài.

## Nhóm 1 — 18 skill AI Engineering (từ repo rohitg00/ai-engineering-from-scratch)

Giáo trình "Kỹ thuật AI từ con số 0" (542 bài, 20 giai đoạn, MIT). Các skill này là gia sư đi kèm giáo trình.

| Skill | Làm gì |
|---|---|
| start-learning | Điểm bắt đầu: phỏng vấn mục tiêu, quiz xếp lớp 10 câu, viết kế hoạch học riêng (LEARNING.md) |
| learn | Gia sư từng bài: dạy tương tác từng mục, quiz cuối bài, không cần clone repo |
| course-guide | Chỉ đường: hỏi bằng tiếng thường là được chỉ đúng bài cần học |
| find-your-level | Quiz xếp lớp 5 lĩnh vực, biết nên bắt đầu từ phase nào |
| check-understanding | Quiz 8 câu cho 1 phase đã học, kiểm tra đã hiểu chưa |
| learn-mcp | Gia sư lộ trình MCP 17 bài, có chế độ chỉ học khái niệm (không cần code) |
| learn-agent-skills | Gia sư lộ trình Agent Skills 5 bài (~9h30m): skill là gì, ai gọi skill, quyền/sandbox, đánh giá skill |
| learn-reverse-engineering | Gia sư lộ trình reverse engineering 14 bài (~32h) — chỉ cho dev |
| build-project | Gia sư dự án thực hành: tự viết code từng bước, chấm bằng grader — chỉ cho dev |
| interview-prep | Luyện phỏng vấn giả xin việc kỹ sư AI: 482 câu + 60 tình huống sự cố |
| claude-certification | Ôn thi 4 chứng chỉ Claude (CCAO-F, CCDV-F, CCAR-F, CCAR-P) — chỉ là tài liệu ôn, không cấp chứng chỉ |
| mcpa-certification | Ôn thi chứng chỉ MCPA (Model Context Protocol Associate, Linux Foundation) |
| lesson-screen | Mở màn hình bài học trên trình duyệt cạnh terminal trong lúc học |
| blueprint-figure | Vẽ hình SVG tĩnh theo phong cách blueprint của khóa học (cho người viết khóa học) |
| motion-figure | Làm hình động/tương tác trong bài học (cho người viết khóa học) |
| isometric-explainer | Làm trang giải thích tương tác dạng "máy đẳng cự" (cho người viết khóa học) |
| course-style | Bảng tham chiếu phong cách chung của khóa học: màu, font, quy tắc viết |
| write-manual | Phương pháp viết sổ tay kỹ thuật dài 60–100 trang về 1 chủ đề |

**5 skill khuyên dùng cho người non-tech:** course-guide, start-learning, learn-mcp (chế độ khái niệm), learn-agent-skills, check-understanding. Còn lại chủ yếu cho dev hoặc người viết khóa học.

## Nhóm 2 — Marketing Skills (51 skill, thư mục `marketing-skills/`)

Từ repo coreyhaines31/marketingskills (MIT). Mỗi skill là 1 chuyên gia marketing: quảng cáo, SEO, nội dung, email, định giá, ra mắt sản phẩm...

| Skill | Làm gì |
|---|---|
| ab-testing | Lên kế hoạch, thiết kế và chạy thử nghiệm A/B |
| ad-creative | Soạn và nhân rộng mẫu quảng cáo trả phí (tiêu đề, mô tả, nội dung) |
| ads | Chạy chiến dịch quảng cáo Google Ads, Meta, LinkedIn, X |
| ai-seo | Tối ưu nội dung để AI search/LLM trích dẫn và trả lời |
| analytics | Dựng, cải thiện và kiểm tra đo lường phân tích (GA4...) |
| aso | Kiểm tra và tối ưu trang ứng dụng trên App Store / Google Play |
| attribution | Tìm xem marketing nào thật sự mang lại đơn hàng, chọn mô hình attribution |
| churn-prevention | Giảm hủy đăng ký: flow giữ chân, ưu đãi cứu khách, thu hồi thanh toán lỗi |
| co-marketing | Tìm đối tác co-marketing, lên chiến dịch chung |
| cold-email | Viết và chạy email lạnh B2B để có trả lời (kèm LinkedIn, đa kênh) |
| community-marketing | Xây và khai thác cộng đồng online để tăng trưởng |
| competitor-profiling | Nghiên cứu và lập hồ sơ đối thủ từ URL của họ |
| competitors | Làm trang so sánh / thay thế đối thủ phục vụ SEO và bán hàng |
| content-strategy | Lên chiến lược nội dung: viết gì, chủ đề nào |
| conversion-tracking | Dựng, kiểm tra và sửa đo lường chuyển đổi trên web |
| copy-editing | Biên tập, cải thiện bài viết marketing có sẵn |
| copywriting | Viết và cải thiện copy cho mọi trang (chủ, landing, giá, tính năng...) |
| cro | Tối ưu tỷ lệ chuyển đổi cho trang web và form |
| customer-research | Làm và tổng hợp nghiên cứu khách hàng (ICP, phỏng vấn...) |
| directory-submissions | Đưa sản phẩm lên các thư mục startup/SaaS/AI để lấy backlink |
| emails | Làm và tối ưu chuỗi email, drip campaign, email vòng đời |
| events | Lên kế hoạch và khai thác sự kiện (webinar, hội thảo, gặp mặt...) |
| free-tools | Lên kế hoạch và làm công cụ miễn phí để kéo khách |
| image | Tạo, sửa và tối ưu hình ảnh marketing |
| influencer-marketing | Chạy hợp tác với influencer/creator/đại sứ |
| launch | Lên kế hoạch ra mắt sản phẩm / tính năng (kèm Product Hunt...) |
| lead-magnets | Làm và tối ưu lead magnet để thu email |
| link-building | Kiếm backlink và nhắc đến từ bên thứ ba để tăng thứ hạng |
| marketing-council | Hỏi ý kiến hội đồng cố vấn marketing mô phỏng (Seth Godin...) |
| marketing-ideas | Gợi ý ý tưởng marketing cho sản phẩm SaaS/phần mềm |
| marketing-loops | Dựng vòng lặp marketing tự chạy định kỳ cho AI agent |
| marketing-plan | Làm kế hoạch marketing tổng thể cho công ty/khách hàng |
| marketing-psychology | Áp dụng tâm lý học và khoa học hành vi vào marketing |
| offers | Thiết kế và cải thiện offer (thứ mình bán): khung giá trị, bonus, bảo đảm |
| onboarding | Tối ưu onboarding sau đăng ký: kích hoạt, time-to-value |
| paywalls | Làm và tối ưu paywall, màn hình nâng cấp, upsell |
| popups | Làm và tối ưu popup, modal, banner để tăng chuyển đổi |
| pricing | Tư vấn định giá, đóng gói, chiến lược kiếm tiền |
| product-marketing | Làm và cập nhật tài liệu product marketing |
| programmatic-seo | Làm trang SEO hàng loạt bằng mẫu và dữ liệu |
| prospecting | Tìm và lập danh sách khách hàng tiềm năng để tiếp cận |
| public-relations | Làm PR, báo chí, quan hệ truyền thông |
| referrals | Làm và tối ưu chương trình giới thiệu / affiliate |
| reverse-engineer-marketing | Mổ xẻ cách 1 công ty đã tăng trưởng và copy cái hiệu quả |
| revops | Làm revenue operations, vòng đời lead, bàn giao marketing → sales |
| sales-enablement | Làm tài liệu bán hàng: pitch deck, one-pager, xử lý từ chối, kịch bản demo |
| schema | Thêm, sửa và tối ưu schema markup / structured data |
| seo-audit | Kiểm tra và chẩn đoán lỗi SEO trên web |
| signup | Tối ưu flow đăng ký / dùng thử |
| site-architecture | Lên và sắp xếp lại cấu trúc trang web (phân cấp, điều hướng, internal link) |
| sms | Làm marketing SMS/MMS/WhatsApp (chào mừng, giỏ hàng bỏ dở, sau mua...) |
| social | Làm và tối ưu nội dung mạng xã hội (LinkedIn, X, Instagram, TikTok, Facebook) |
| video | Làm video bằng AI hoặc framework lập trình |

## Nhóm 3 — Superpowers (15 skill, thư mục `superpowers/`)

Từ repo obra/superpowers (MIT). Bộ skill kỷ luật làm việc cho dev dùng Claude Code: lập kế hoạch, viết test trước, debug có hệ thống, kiểm chứng trước khi báo xong.

| Skill | Làm gì |
|---|---|
| using-superpowers | Bắt buộc dùng skill trước MỌI câu trả lời — skill gốc của cả bộ |
| brainstorming | Động não trước mọi việc sáng tạo: tính năng, component, kế hoạch |
| writing-plans | Viết kế hoạch trước khi động vào việc nhiều bước |
| executing-plans | Thực thi kế hoạch trong phiên hiện tại |
| subagent-driven-development | Chạy kế hoạch bằng subagent cho các việc độc lập |
| dispatching-parallel-agents | Giao 2+ việc độc lập cho các agent chạy song song |
| test-driven-development | Viết test trước rồi mới viết code |
| systematic-debugging | Debug có hệ thống trước khi đề xuất cách sửa |
| verification-before-completion | Kiểm chứng bằng lệnh thật trước khi báo xong / commit / tạo PR |
| requesting-code-review | Xin review code trước khi gộp |
| receiving-code-review | Xử lý phản hồi review code (kể cả khi phản hồi có vẻ sai) |
| finishing-a-development-branch | Quyết định cách gộp nhánh khi xong việc, test đã xanh |
| using-git-worktrees | Dùng git worktree để tách không gian làm việc cho tính năng mới |
| writing-skills | Viết skill mới, sửa skill cũ, kiểm chứng skill chạy được trước khi dùng |
| diagnosing-superpowers | Chẩn đoán khi phiên superpowers chạy sai (lặp lại, bỏ qua kế hoạch...) |

## Nguồn & giấy phép

- Nhóm 1: https://github.com/rohitg00/ai-engineering-from-scratch — MIT (Copyright 2026 Rohit Ghumare)
- Nhóm 2: https://github.com/coreyhaines31/marketingskills — MIT (Copyright 2025 Corey Haines)
- Nhóm 3: https://github.com/obra/superpowers — MIT (Copyright 2025 Jesse Vincent)

Cả 3 repo đều mã nguồn mở, giấy phép MIT — dùng tự do, ghi nguồn là được.

## Lưu ý

- Skill nhóm 1 học theo lộ trình 542 bài của giáo trình gốc (tiếng Anh); người non-tech chỉ cần 5 skill đã ghi ở trên.
- Skill nhóm 2 và 3 cài qua plugin marketplace của Claude Code cũng được (xem mục Cách cài).
- File trong các skill là nguyên văn từ repo gốc, không sửa nội dung.
