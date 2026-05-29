const fetch = require('node-fetch');

async function simulate() {
  // 1. Fetch provinces from open-api.vn
  const pRes = await fetch("https://provinces.open-api.vn/api/p/");
  const provinces = await pRes.json();
  
  // 2. OSM response
  const displayName = "Trường Tiểu học Nguyễn Trung Trực, 962, Kha Vạn Cân, Khu phố 61, Phường Thủ Đức, Thủ Đức, Thành phố Hồ Chí Minh, 71221, Việt Nam";
  const nameParts = displayName.split(',').map(s => s.trim());
  
  // 3. matchProv logic
  const matchProv = provinces.find(p => {
    const baseProv = p.name.replace(/^(Thành phố|Tỉnh)\s+/i, "");
    return nameParts.some(part => part === p.name || part === baseProv || part.includes(p.name) || (baseProv.length > 2 && part.includes(baseProv)));
  });
  
  console.log("Matched Province:", matchProv);
}

simulate();
