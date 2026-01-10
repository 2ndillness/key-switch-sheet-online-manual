// 共通のJSON取得関数
const fetchJson = (url) => {
  return fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    });
};

// --- データ読み込み・更新系 ---

// 更新履歴の生成
const changelogList = document.getElementById('changelog-list');
if (changelogList) {
  fetchJson('changelog.json')
    .then(data => {
      data.forEach(item => {
        // dt要素 (日付とバージョン)
        const dt = document.createElement('dt');
        dt.textContent = `${item.date} (${item.version})`;

        // dd要素 (変更内容リスト)
        const dd = document.createElement('dd');
        const ul = document.createElement('ul');

        item.changes.forEach(change => {
          const li = document.createElement('li');
          li.textContent = change;
          ul.appendChild(li);
        });

        dd.appendChild(ul);
        changelogList.appendChild(dt);
        changelogList.appendChild(dd);
      });
    })
    .catch(err => console.error('更新履歴の読み込みに失敗しました', err));
}

// リンク設定(app_links.json)の読み込みと適用
fetchJson('app_links.json')
  .then(links => {
    // 0. 配布用テンプレートリンクの更新
    const sheetIdEntry = links.find(link => link.label === 'Spreadsheet ID');
    const templateLink = document.getElementById('template-link');
    if (sheetIdEntry && templateLink) {
      templateLink.href =
        `https://docs.google.com/spreadsheets/d/${sheetIdEntry.url}/template/preview`;
    }

    // 1. Gemini Gemリンクの更新
    const gemLink = links.find(link => link.label.includes('Gem'));
    if (gemLink) {
      const gemBtns = document.querySelectorAll('.js-gem-link');
      gemBtns.forEach(btn => btn.href = gemLink.url);
    }

    // 2. 動画セクションの更新
    const videoLink = links.find(link => link.label.includes('YouTube'));
    const videoContainer = document.getElementById('video-container');
    if (videoLink && videoContainer) {
      videoContainer.innerHTML = ''; // 既存のプレースホルダーをクリア

      // URLから動画IDを抽出 (v=XXXX)
      let videoId = null;
      try {
        const urlObj = new URL(videoLink.url);
        videoId = urlObj.searchParams.get('v');
      } catch (e) {
        // URL解析失敗時はリンクとして扱う
      }

      if (videoId) {
        // 動画IDがある場合は埋め込みプレーヤーを表示
        const wrapper = document.createElement('div');
        wrapper.className = 'video-responsive';
        wrapper.innerHTML = `
          <iframe
            src="https://www.youtube.com/embed/${videoId}"
            title="${videoLink.label}"
            allow="accelerometer; autoplay; clipboard-write;
              encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          >
          </iframe>`;
        videoContainer.appendChild(wrapper);
      } else {
        // 動画IDがない場合は準備中メッセージを表示
        const p = document.createElement('p');
        p.textContent = 'ただいま準備中です。';
        p.style.marginBottom = '0.5rem';
        videoContainer.appendChild(p);

        // URLが設定されている場合（チャンネルTOPなど）はリンクボタンを表示
        if (videoLink.url) {
          const div = document.createElement('div');
          div.className = 'right';

          const a = document.createElement('a');
          a.href = videoLink.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.className = 'gem-btn'; // 既存のボタンスタイルを流用
          a.textContent = '📺 YouTubeチャンネルを開く';

          div.appendChild(a);
          videoContainer.appendChild(div);
        }
      }
    }
  })
  .catch(err => console.error('リンク設定の読み込みに失敗しました', err));

// SNSリンク設定(config.json)の読み込みと適用
const snsContainer = document.getElementById('sns-links');
if (snsContainer) {
  fetchJson('config.json')
    .then(config => {
      if (config.sns && Array.isArray(config.sns)) {
        config.sns.forEach(item => {
          const link = document.createElement('a');
          link.href = item.url;
          link.textContent = item.name;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.style.margin = '0 10px';
          link.style.display = 'inline-block';
          snsContainer.appendChild(link);
        });
      }
    })
    .catch(err => console.error('SNS設定の読み込みに失敗しました', err));
}

// --- 画面制御系 ---

// トップへ戻るボタンの制御
const backToTop = document.getElementById('back-to-top');
if (backToTop) {
  let isScrolling = false;

  window.addEventListener('scroll', () => {
    if (!isScrolling) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 300) {
          backToTop.classList.add('visible');
        } else {
          backToTop.classList.remove('visible');
        }
        isScrolling = false;
      });
      isScrolling = true;
    }
  }, { passive: true });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// 画像モーダル制御
const modal = document.getElementById("imageModal");
const modalImg = document.getElementById("img01");
const images = document.querySelectorAll('.zoomable');

images.forEach(img => {
  // アイコン表示用のラッパーを自動生成（tall-crop以外）
  if (!img.parentElement.classList.contains('tall-crop')) {
    const wrapper = document.createElement('div');
    wrapper.className = 'zoom-container';
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);
  }

  img.addEventListener('click', function() {
    modal.style.display = "block";
    modalImg.src = this.src;
  });
});

const closeSpan = document.querySelector(".close");
if (closeSpan) closeSpan.onclick = () => modal.style.display = "none";

modal.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

// アコーディオン制御関数
const setupAccordion = (accordion)  => {
  const header = accordion.querySelector('.accordion-header');
  const content = accordion.querySelector('.accordion-content');
  let animation = null; // アニメーションインスタンスを保持

  if (!header || !content) return;

  // 初期状態: is-openクラスがなければ隠しておく
  if (!accordion.classList.contains('is-open')) {
    content.style.display = 'none';
  }

  header.addEventListener('click', () => {
    // アニメーション中は操作を無視、またはキャンセルして再実行
    if (animation) {
      animation.cancel();
    }

    if (content.style.display === 'none') {
      // 開く
      accordion.classList.add('is-open');
      content.style.display = 'block';
      animation = content.animate(
        [{ height: '0px', opacity: 0 }, { height: content.scrollHeight + 'px', opacity: 1 }],
        { duration: 300, easing: 'ease-out' }
      );
      animation.onfinish = () => animation = null;
    } else {
      // 閉じる
      accordion.classList.remove('is-open');
      // 閉じるアニメーション
      animation = content.animate(
        [{ height: content.scrollHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
        { duration: 300, easing: 'ease-out' }
      );
      animation.onfinish = () => {
        content.style.display = 'none';
        animation = null;
      };
    }
  });
}

// クラス .accordion を持つ要素に適用
document.querySelectorAll('.accordion').forEach(setupAccordion);

// スマホ用メニューの制御
const navToggle = document.getElementById('nav-toggle');
if (navToggle) {
  // メニュー内のリンクをクリックしたら自動で閉じる
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.checked = false;
    });
  });

  // スワイプ操作でメニューを開閉 (左:閉じる / 右:開く)
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    // 垂直スクロールとの誤判定を防ぐため、水平移動量が垂直移動量より大きい場合のみ判定
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 50 && !navToggle.checked) {
        // 右スワイプ (50px以上) -> 開く
        navToggle.checked = true;
      } else if (diffX < -50 && navToggle.checked) {
        // 左スワイプ (50px以上) -> 閉じる
        navToggle.checked = false;
      }
    }
  }, { passive: true });
}