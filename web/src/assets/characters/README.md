# 무무 투명 캐릭터 이미지

mumu-stage-1.png부터 mumu-stage-6.png까지 각 성장 단계의 투명 PNG입니다.
제공된 1단계.png ~ 6단계.png를 built-in image_gen 도구로 배경 추출했습니다.
원본 첨부 파일은 변경하지 않았습니다.

공통 편집 프롬프트: "Remove ONLY the light paper background outside the character and its detached heart and ground shadow. Output a genuinely transparent PNG cutout. Preserve the original character silhouette, pose, proportions, hand-drawn outline, white opaque body and eggshell, facial features, colors, paws, pacifier, ears, tail and heart. Keep the ground shadow softly translucent. Do not redraw or redesign."

image-bounds.json은 이미지 크기와 알파 경계를 기록합니다. PNG를 바꿀 경우 이 경계와 MumuCharacterDesign.tsx의 boxes를 함께 확인하세요.
PNG 안의 눈·입·팔은 고정입니다. 전체 몸 움직임과 하트 효과, SVG 옷 오버레이는 별도로 유지합니다.

분리 이미지와 관절 애니메이션을 추가할 때는 [parts/README.md](parts/README.md)를 따릅니다. 단계별 body.png를 넣으면 자동 전환됩니다.
