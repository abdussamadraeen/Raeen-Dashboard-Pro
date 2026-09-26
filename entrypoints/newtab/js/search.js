import { state, saveSettings } from './state.js';
import { dom } from './dom.js';
import { escapeHTML } from './security.js';

export const GOOGLE_COLOR_G_SVG = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22%234285F4%22%20d%3D%22M23.745%2012.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29%201.52-1.14%202.82-2.4%203.68v3.05h3.88c2.27-2.09%203.66-5.17%203.66-9.17z%22%2F%3E%3Cpath%20fill%3D%22%2334A853%22%20d%3D%22M12%2024c3.24%200%205.95-1.08%207.93-2.91l-3.88-3.05c-1.08.72-2.45%201.16-4.05%201.16-3.12%200-5.77-2.1-6.72-4.93H1.25v3.15C3.26%2021.36%207.33%2024%2012%2024z%22%2F%3E%3Cpath%20fill%3D%22%23FBBC05%22%20d%3D%22M5.28%2014.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45%208.18%200%2010.03%200%2012s.45%203.82%201.25%205.42l4.03-3.15z%22%2F%3E%3Cpath%20fill%3D%22%23EA4335%22%20d%3D%22M12%204.75c1.77%200%203.35.61%204.6%201.8l3.42-3.42C17.95%201.19%2015.24%200%2012%200%207.33%200%203.26%202.64%201.25%206.58l4.03%203.15c.95-2.83%203.6-4.98%206.72-4.98z%22%2F%3E%3C%2Fsvg%3E";
export const BRAVE_SVG = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xml%3Aspace%3D%22preserve%22%20id%3D%22Layer_1%22%20x%3D%220%22%20y%3D%220%22%20version%3D%221.1%22%20viewBox%3D%2237.6%200%20436.7%20511.9%22%3E%3Cstyle%3E.st1%7Bfill%3A%23fff%7D%3C%2Fstyle%3E%3ClinearGradient%20id%3D%22SVGID_1_%22%20x1%3D%22206.078%22%20x2%3D%22642.662%22%20y1%3D%22128.75%22%20y2%3D%22128.75%22%20gradientTransform%3D%22matrix(1%200%200%20-1%20-168.37%20384.75)%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%220%22%20style%3D%22stop-color%3A%23f1562b%22%2F%3E%3Cstop%20offset%3D%22.3%22%20style%3D%22stop-color%3A%23f1542b%22%2F%3E%3Cstop%20offset%3D%22.41%22%20style%3D%22stop-color%3A%23f04d2a%22%2F%3E%3Cstop%20offset%3D%22.49%22%20style%3D%22stop-color%3A%23ef4229%22%2F%3E%3Cstop%20offset%3D%22.5%22%20style%3D%22stop-color%3A%23ef4029%22%2F%3E%3Cstop%20offset%3D%22.56%22%20style%3D%22stop-color%3A%23e83e28%22%2F%3E%3Cstop%20offset%3D%22.67%22%20style%3D%22stop-color%3A%23e13c26%22%2F%3E%3Cstop%20offset%3D%221%22%20style%3D%22stop-color%3A%23df3c26%22%2F%3E%3C%2FlinearGradient%3E%3Cpath%20d%3D%22m474.3%20165.6-15.8-42.9%2011-24.6c1.4-3.2.7-6.9-1.7-9.4l-29.9-30.2c-13.1-13.3-32.6-17.8-50.2-11.7l-8.4%202.9L333.7.4%20256.3%200h-.5L178%20.6l-45.6%2049.8-8.1-2.9c-17.7-6.2-37.4-1.6-50.6%2011.8L43.3%2090.1c-2%202-2.5%204.9-1.4%207.5l11.4%2025.5-15.7%2042.8%2010.2%2038.6%2046.3%20176.1c5.3%2020.3%2017.6%2038.1%2034.7%2050.2%200%200%2056.2%2039.7%20111.7%2075.7%209%207.2%2021.9%207.2%2030.9%200%2062.3-40.8%20111.6-75.8%20111.6-75.8%2017.1-12.2%2029.3-30%2034.7-50.2l46.1-176.2z%22%20style%3D%22fill%3Aurl(%23SVGID_1_)%22%2F%3E%3Cpath%20d%3D%22M268.8%20317.4c-3-1.3-6-2.4-9.1-3.3h-5.5c-3.1.9-6.2%202-9.1%203.3l-13.8%205.7c-4.4%201.8-11.4%205.1-15.6%207.2l-25.4%2013.2c-2.5.8-3.9%203.6-3.1%206.1.4%201.3%201.3%202.3%202.5%202.9l22.1%2015.6c3.9%202.7%2010%207.5%2013.6%2010.8l6.2%205.3c3.6%203.1%209.4%208.2%2013%2011.4l5.9%205.2c3.8%203.1%209.2%203.1%2013%200l6.2-5.4%2013-11.3%206.2-5.5c3.6-3.1%209.7-7.9%2013.5-10.8l22.1-15.8c2.4-1.1%203.4-4%202.3-6.4-.6-1.2-1.6-2.1-2.9-2.5l-25.4-12.9c-4.2-2.2-11.3-5.4-15.7-7.2z%22%20class%3D%22st1%22%2F%3E%3Cpath%20d%3D%22m425.2%20175.2.7-2.3c0-3.1-.1-6.1-.6-9.2-2.1-5.4-4.9-10.6-8.2-15.4l-14.4-21.1c-2.7-3.9-7.2-10.2-10.2-13.9l-19.2-24.1c-1.8-2.3-3.7-4.6-5.7-6.7h-.4s-3.9.7-8.5%201.6l-29.4%205.7-12.9%202.5c-4.3.2-8.6-.4-12.6-1.8L280.6%2083c-4.5-1.5-12-3.6-16.6-4.6q-7.35-.75-14.7%200c-4.6%201.1-12.1%203.2-16.6%204.6l-23.2%207.5c-4%201.4-8.3%202-12.6%201.8L184%2090l-29.4-5.6c-4.7-.9-8.5-1.6-8.5-1.6h-.4c-2%202.1-4%204.3-5.7%206.7l-19.2%2024.1c-2.9%203.6-7.6%2010-10.2%2013.9l-14.4%2021.1c-2.5%203.6-4.7%207.4-6.8%2011.3-1.2%204.3-1.9%208.8-1.9%2013.3l.7%202.3c.3%201.5.8%202.9%201.3%204.3%203%203.6%208.1%209.5%2011.3%2013l50.2%2053.4c3.4%204%204.4%209.5%202.5%2014.4l-8.2%2019.5c-1.9%205.2-2%2010.8-.4%2016l1.7%204.5c2.7%207.3%207.3%2013.8%2013.4%2018.8l7.9%206.4c4.2%203%209.6%203.7%2014.4%201.7l28.1-13.4c5.2-2.6%2010-5.8%2014.4-9.5l22.5-20.3c3.7-3.3%204-9%20.6-12.7l-.2-.2-50.7-34.2c-4-2.8-5.3-8.1-3.1-12.5l19.7-37c2.3-4.6%202.6-9.8%201-14.7-2.4-4.6-6.4-8.1-11.2-10.1l-61.6-23.3c-4.4-1.7-4.2-3.6.5-3.9l36.2-3.6c5.7-.4%2011.4.1%2016.9%201.5l31.5%208.8c4.6%201.4%207.5%206%206.7%2010.8l-12.4%2067.6c-.8%203.7-1%207.6-.6%2011.4.5%201.6%204.7%203.6%209.4%204.7l19.2%204.1c5.6%201%2011.3%201%2016.9%200l17.3-3.9c4.6-1%208.8-3.2%209.4-4.8.4-3.8.2-7.7-.6-11.4l-12.5-67.6c-.8-4.8%202.1-9.4%206.7-10.8l31.5-8.8c5.5-1.4%2011.2-1.9%2016.9-1.5l36.2%203.4c4.7.4%205%202.2.5%203.9l-61.6%2023.4c-4.8%202-8.7%205.6-11.2%2010.1-1.6%204.8-1.3%2010.1%201%2014.7l19.7%2037c2.2%204.3.9%209.6-3.1%2012.5l-50.7%2034.2c-3.4%203.6-3.3%209.3.3%2012.7l.2.2%2022.5%2020.3c4.4%203.7%209.2%206.9%2014.4%209.5l28.1%2013.3c4.8%201.9%2010.2%201.3%2014.4-1.8l7.9-6.5c6.1-5%2010.7-11.4%2013.4-18.8l1.7-4.5c1.6-5.2%201.5-10.9-.4-16l-8.3-19.5c-1.8-4.9-.8-10.4%202.5-14.4l50.2-53.5c3.3-3.6%208.3-9.3%2011.3-13%20.5-1.3%201-2.7%201.4-4.2%22%20class%3D%22st1%22%2F%3E%3C%2Fsvg%3E";
export const DUCKDUCKGO_SVG = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20xml%3Aspace%3D%22preserve%22%20id%3D%22Layer_1%22%20x%3D%220%22%20y%3D%220%22%20version%3D%221.1%22%20viewBox%3D%220%200%20512%20512%22%3E%3Cstyle%3E.st0%7Bfill%3A%23fff%7D.st4%7Bfill%3A%232d4f8e%7D.st8%7Bfill%3A%2365bc46%7D%3C%2Fstyle%3E%3Cpath%20d%3D%22M497.7%20254.3c0%20138.2-108.7%20250.2-242.7%20250.2S12.3%20392.5%2012.3%20254.3%20121%204.1%20255.1%204.1c134%200%20242.6%20112%20242.6%20250.2%22%20class%3D%22st0%22%2F%3E%3ClinearGradient%20id%3D%22SVGID_1_%22%20x1%3D%22-899.964%22%20x2%3D%22-899.964%22%20y1%3D%22-1663.394%22%20y2%3D%22-1621.436%22%20gradientTransform%3D%22matrix(12.2027%200%200%20-12.2027%2011238.032%20-19785.963)%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%220%22%20style%3D%22stop-color%3A%23d14427%22%2F%3E%3Cstop%20offset%3D%221%22%20style%3D%22stop-color%3A%23e55225%22%2F%3E%3C%2FlinearGradient%3E%3Cpath%20d%3D%22M480%20256c0%20123.7-100.3%20224-224%20224S32%20379.7%2032%20256%20132.3%2032%20256%2032s224%20100.3%20224%20224m32%200c0%20141.4-114.6%20256-256%20256S0%20397.4%200%20256%20114.6%200%20256%200s256%20114.6%20256%20256m-21.1%200c0-129.7-105.2-234.9-234.9-234.9S21.1%20126.3%2021.1%20256%20126.3%20490.9%20256%20490.9%20490.9%20385.7%20490.9%20256%22%20style%3D%22fill%3Aurl(%23SVGID_1_)%22%2F%3E%3Cdefs%3E%3Cpath%20id%3D%22SVGID_00000116230508440019795290000007073017068982376630_%22%20d%3D%22M480.9%20255.4c0%20124-100.9%20224.8-224.9%20224.8S31.2%20379.3%2031.2%20255.4C31.2%20131.4%20132%2030.6%20256%2030.6s224.9%20100.8%20224.9%20224.8%22%2F%3E%3C%2Fdefs%3E%3CclipPath%20id%3D%22SVGID_00000010284946673283237210000015792187200079878288_%22%3E%3Cuse%20xlink%3Ahref%3D%22%23SVGID_00000116230508440019795290000007073017068982376630_%22%20style%3D%22overflow%3Avisible%22%2F%3E%3C%2FclipPath%3E%3Cg%20style%3D%22clip-path%3Aurl(%23SVGID_00000010284946673283237210000015792187200079878288_)%22%3E%3Cpath%20d%3D%22M346%20582.9c-7.7-35.6-52.6-116-69.6-150.1-17-34-34.1-82-26.3-112.9%201.4-5.6-14.7-48.5-10.1-51.6%2036.1-23.6%2045.6%202.6%2060.1-8%207.5-5.5%2017.6%204.5%2020.1-4.5%209.3-32.5-12.9-89.1-37.6-113.8-8.1-8.1-20.5-13.1-34.5-15.8-5.4-7.4-14.1-14.4-26.3-20.9-13.8-7.3-43.5-16.9-58.9-19.5-10.7-1.8-13.1%201.2-17.7%202%204.3.4%2024.5%2010.4%2028.4%2010.9-3.9%202.7-15.5-.1-22.8%203.2-3.7%201.7-6.5%208.1-6.5%2011.1%2021.1-2.1%2054-.1%2073.4%208.6-15.5%201.8-39%203.7-49.1%209-29.4%2015.5-42.4%2051.6-34.6%2095%207.7%2043.2%2041.8%20201%2052.6%20253.7%2010.8%2052.6-23.2%2086.6-44.9%2095.9l23.2%201.6-7.7%2017c27.8%203.1%2058.8-6.2%2058.8-6.2-6.2%2017-48%2023.2-48%2023.2s20.1%206.2%2052.6-6.2%2052.6-20.1%2052.6-20.1l15.5%2040.2%2029.4-29.4%2012.4%2030.9c0%20.1%2023.2-7.7%2015.5-43.3%22%20style%3D%22fill%3A%23d5d7d8%22%2F%3E%3Cpath%20d%3D%22M355.3%20575.7c-7.7-35.6-52.6-116-69.6-150.1-17-34-34-82-26.3-112.9%201.4-5.6%201.5-28.6%206.1-31.7%2036.1-23.6%2033.5-.8%2048-11.3%207.5-5.4%2013.4-12%2016-21.1%209.3-32.5-12.9-89.1-37.6-113.8-8.1-8.1-20.5-13.1-34.4-15.8-5.4-7.4-14-14.4-26.3-20.9-23.1-12.3-51.8-17.2-78.4-12.4%204.2.4%2014%209.2%2017.9%209.8-5.9%204-21.7%203.5-21.6%2012.4%2021.1-2.1%2044.2%201.2%2063.7%209.9-15.5%201.8-29.8%205.6-40%2010.9-29.4%2015.5-37.1%2046.4-29.4%2089.7%207.8%2043.3%2041.8%20201.1%2052.6%20253.7s-23.2%2086.6-44.8%2095.9l23.2%201.5-7.7%2017c27.8%203.1%2058.8-6.2%2058.8-6.2-6.2%2017-48%2023.2-48%2023.2s20.1%206.2%2052.6-6.2%2052.6-20.1%2052.6-20.1l15.5%2040.2%2029.4-29.4%2012.4%2030.9c-.1.1%2023.1-7.6%2015.3-43.2%22%20class%3D%22st0%22%2F%3E%3Cpath%20d%3D%22M177.4%20220.5c0-9%207.3-16.2%2016.2-16.2%209%200%2016.2%207.3%2016.2%2016.2%200%209-7.3%2016.2-16.2%2016.2-8.9.1-16.1-7.2-16.2-16.2%22%20class%3D%22st4%22%2F%3E%3Cpath%20d%3D%22M196.7%20215.1c0-2.3%201.9-4.2%204.2-4.2s4.2%201.9%204.2%204.2-1.9%204.2-4.2%204.2-4.2-1.9-4.2-4.2%22%20class%3D%22st0%22%2F%3E%3Cpath%20d%3D%22M288.3%20210.9c0-7.7%206.3-13.9%2014-13.9s14%206.2%2014%2014c0%207.7-6.2%2014-14%2014-7.7-.2-13.9-6.4-14-14.1%22%20class%3D%22st4%22%2F%3E%3Cpath%20d%3D%22M304.9%20206.2c0-2%201.6-3.6%203.6-3.6s3.6%201.6%203.6%203.6-1.6%203.6-3.5%203.6h-.1c-2%200-3.6-1.6-3.6-3.6%22%20class%3D%22st0%22%2F%3E%3ClinearGradient%20id%3D%22SVGID_00000148627574217912605100000012656822746852819086_%22%20x1%3D%22-907.704%22%20x2%3D%22-904.691%22%20y1%3D%22-1636.091%22%20y2%3D%22-1636.091%22%20gradientTransform%3D%22matrix(12.2027%200%200%20-12.2027%2011238.032%20-19785.963)%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%22.006%22%20style%3D%22stop-color%3A%236176b9%22%2F%3E%3Cstop%20offset%3D%22.691%22%20style%3D%22stop-color%3A%23394a9f%22%2F%3E%3C%2FlinearGradient%3E%3Cpath%20d%3D%22M198.3%20173.4s-12.2-5.5-24.2%201.9c-11.9%207.5-11.4%2015.1-11.4%2015.1s-6.3-14.1%2010.5-21c16.9-6.8%2025.1%204%2025.1%204%22%20style%3D%22fill%3Aurl(%23SVGID_00000148627574217912605100000012656822746852819086_)%22%2F%3E%3ClinearGradient%20id%3D%22SVGID_00000004515011562323185290000011359407635172696710_%22%20x1%3D%22-898.226%22%20x2%3D%22-895.481%22%20y1%3D%22-1635.173%22%20y2%3D%22-1635.173%22%20gradientTransform%3D%22matrix(12.2027%200%200%20-12.2027%2011238.032%20-19785.963)%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%22.006%22%20style%3D%22stop-color%3A%236176b9%22%2F%3E%3Cstop%20offset%3D%22.691%22%20style%3D%22stop-color%3A%23394a9f%22%2F%3E%3C%2FlinearGradient%3E%3Cpath%20d%3D%22M310.7%20172.3s-8.8-5-15.6-4.9c-14%20.2-17.9%206.4-17.9%206.4s2.4-14.8%2020.3-11.8c9.8%201.5%2013.2%2010.3%2013.2%2010.3%22%20style%3D%22fill%3Aurl(%23SVGID_00000004515011562323185290000011359407635172696710_)%22%2F%3E%3C%2Fg%3E%3Cpath%20d%3D%22M243.4%20283.2c1.6-9.8%2027-28.4%2045-29.6%2018-1.1%2023.6-.9%2038.7-4.5s53.8-13.3%2064.5-18.2c10.7-5%2056.2%202.5%2024.2%2020.3-13.9%207.8-51.3%2022-78%2030s-42.9-7.6-51.7%205.5c-7.1%2010.4-1.4%2024.7%2030.5%2027.7%2043.1%204%2084.4-19.4%2088.9-7%204.6%2012.4-37%2027.9-62.3%2028.4s-76.3-16.7-83.9-22c-7.8-5.3-18-17.7-15.9-30.6%22%20style%3D%22fill%3A%23fdd20a%22%2F%3E%3Cpath%20d%3D%22M262.9%20417.5s-60.5-32.3-61.5-19.2%200%2066.5%207.1%2070.6c7.1%204%2057.5-26.2%2057.5-26.2zm23.2-2.1s41.3-31.3%2050.4-29.2%2011.1%2066.6%203%2069.6-55.4-16.4-55.4-16.4z%22%20class%3D%22st8%22%2F%3E%3Cpath%20d%3D%22M248.3%20420.9c0%2021.2-3%2030.2%206.1%2032.3%209.1%202%2026.2%200%2032.3-4s1-31.2-1-36.3c-2.2-5.1-37.4-1.1-37.4%208%22%20style%3D%22fill%3A%2343a244%22%2F%3E%3Cpath%20d%3D%22M252.1%20416.2c0%2021.2-3%2030.3%206.1%2032.3%209%202%2026.2%200%2032.3-4s1-31.2-1-36.3c-2.1-5.1-37.4-1.1-37.4%208%22%20class%3D%22st8%22%2F%3E%3Cpath%20d%3D%22M309.7%20472.1c-18.1%204.6-36.7%206.9-55.4%206.9-20.2%200-39.8-2.7-58.5-7.8l.2%201.8c19%205.1%2038.6%207.7%2058.3%207.7%2019.4%200%2038.1-2.5%2056.1-7.1z%22%20class%3D%22st0%22%2F%3E%3C%2Fsvg%3E";
export const BING_SVG = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20viewBox%3D%220%200%20234%20343.41%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22b%22%20x1%3D%22-29.25%22%20x2%3D%22-23.09%22%20y1%3D%22662.02%22%20y2%3D%22658.46%22%20gradientTransform%3D%22matrix(24.45%200%200%20-24.45%20967.18%2016420.97)%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%2337bdff%22%2F%3E%3Cstop%20offset%3D%22.18%22%20stop-color%3D%22%2333bffd%22%2F%3E%3Cstop%20offset%3D%22.36%22%20stop-color%3D%22%2328c5f5%22%2F%3E%3Cstop%20offset%3D%22.53%22%20stop-color%3D%22%2315d0e9%22%2F%3E%3Cstop%20offset%3D%22.55%22%20stop-color%3D%22%2312d1e7%22%2F%3E%3Cstop%20offset%3D%22.59%22%20stop-color%3D%22%231cd2e5%22%2F%3E%3Cstop%20offset%3D%22.77%22%20stop-color%3D%22%2342d8dc%22%2F%3E%3Cstop%20offset%3D%22.91%22%20stop-color%3D%22%2359dbd6%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2362dcd4%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22c%22%20x1%3D%22-32.86%22%20x2%3D%22-23.89%22%20y1%3D%22656.68%22%20y2%3D%22656.68%22%20gradientTransform%3D%22matrix(24.45%200%200%20-24.45%20967.18%2016420.97)%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%2339d2ff%22%2F%3E%3Cstop%20offset%3D%22.15%22%20stop-color%3D%22%2338cefe%22%2F%3E%3Cstop%20offset%3D%22.29%22%20stop-color%3D%22%2335c3fa%22%2F%3E%3Cstop%20offset%3D%22.43%22%20stop-color%3D%22%232fb0f3%22%2F%3E%3Cstop%20offset%3D%22.55%22%20stop-color%3D%22%23299aeb%22%2F%3E%3Cstop%20offset%3D%22.58%22%20stop-color%3D%22%232692ec%22%2F%3E%3Cstop%20offset%3D%22.76%22%20stop-color%3D%22%231a6cf1%22%2F%3E%3Cstop%20offset%3D%22.91%22%20stop-color%3D%22%231355f4%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23104cf5%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22d%22%20x1%3D%22-31.2%22%20x2%3D%22-31.2%22%20y1%3D%22655.9%22%20y2%3D%22667.89%22%20gradientTransform%3D%22matrix(24.45%200%200%20-24.45%20967.18%2016420.97)%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%231b48ef%22%2F%3E%3Cstop%20offset%3D%22.12%22%20stop-color%3D%22%231c51f0%22%2F%3E%3Cstop%20offset%3D%22.32%22%20stop-color%3D%22%231e69f5%22%2F%3E%3Cstop%20offset%3D%22.57%22%20stop-color%3D%22%232190fb%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2326b8f4%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22a%22%20x1%3D%22-31.08%22%20x2%3D%22-25.54%22%20y1%3D%22654.47%22%20y2%3D%22660%22%20gradientTransform%3D%22matrix(24.45%200%200%20-24.45%20967.18%2016420.97)%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23fff%22%2F%3E%3Cstop%20offset%3D%22.37%22%20stop-color%3D%22%23fdfdfd%22%2F%3E%3Cstop%20offset%3D%22.51%22%20stop-color%3D%22%23f6f6f6%22%2F%3E%3Cstop%20offset%3D%22.6%22%20stop-color%3D%22%23ebebeb%22%2F%3E%3Cstop%20offset%3D%22.68%22%20stop-color%3D%22%23dadada%22%2F%3E%3Cstop%20offset%3D%22.75%22%20stop-color%3D%22%23c4c4c4%22%2F%3E%3Cstop%20offset%3D%22.81%22%20stop-color%3D%22%23a8a8a8%22%2F%3E%3Cstop%20offset%3D%22.86%22%20stop-color%3D%22%23888%22%2F%3E%3Cstop%20offset%3D%22.91%22%20stop-color%3D%22%23626262%22%2F%3E%3Cstop%20offset%3D%22.95%22%20stop-color%3D%22%23373737%22%2F%3E%3Cstop%20offset%3D%22.99%22%20stop-color%3D%22%23090909%22%2F%3E%3Cstop%20offset%3D%221%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20xlink%3Ahref%3D%22%23a%22%20id%3D%22h%22%20x1%3D%22-31.2%22%20x2%3D%22-31.2%22%20y1%3D%22668.1%22%20y2%3D%22656.02%22%2F%3E%3CclipPath%20id%3D%22e%22%20transform%3D%22translate(-163%20-82.94)%22%3E%3Cpath%20d%3D%22M163.02%20288.38h227.17v140.76H163.02z%22%20style%3D%22fill%3Anone%22%2F%3E%3C%2FclipPath%3E%3CclipPath%20id%3D%22g%22%20transform%3D%22translate(-163%20-82.94)%22%3E%3Cpath%20d%3D%22M163.02%2082.87h86.51v302.96h-86.51z%22%20style%3D%22fill%3Anone%22%2F%3E%3C%2FclipPath%3E%3C%2Fdefs%3E%3Cpath%20d%3D%22M397%20303.4a92.73%2092.73%200%200%201-24.84%2063.16%2042%2042%200%200%200%204.5-6%2038%2038%200%200%200%202.69-5.08%2018%2018%200%200%200%20.74-1.78%2017%2017%200%200%200%20.65-1.78c.21-.56.39-1.14.55-1.72s.33-1.2.46-1.81l.07-.21c.14-.6.25-1.2.37-1.81s.23-1.25.33-1.88c.09-.58.16-1.16.21-1.76a40%2040%200%200%200%20.21-4.13%2041.4%2041.4%200%200%200-5.94-21.49%2036.5%2036.5%200%200%200-2.85-4.17%2040%2040%200%200%200-4-4.43%2041.5%2041.5%200%200%200-12.36-8.28%2039%2039%200%200%200-6.22-2.14h-.09l-.74-.25-10.81-3.71-28.27-9.72h-.28l-1.77-.65A26.23%2026.23%200%200%201%20296.29%20272L286%20245.62l-11.83-30.16-2.27-5.82-.58-1.18a13.4%2013.4%200%200%201-1-5.08%2012%2012%200%200%201%200-1.35%2013.19%2013.19%200%200%201%2018.26-10.79l52.69%2027%2010.39%205.31A91%2091%200%200%201%20367%20235a92.45%2092.45%200%200%201%2029.79%2061.87c.12%202.19.21%204.35.21%206.53%22%20style%3D%22fill%3Aurl(%23b)%22%20transform%3D%22translate(-163%20-82.94)%22%2F%3E%3Cpath%20d%3D%22M382.91%20338.56a43%2043%200%200%201-.72%207.82c-.14.67-.28%201.35-.44%202-.3%201.2-.62%202.36-1%203.53-.21.6-.42%201.2-.65%201.78s-.49%201.18-.74%201.78a38%2038%200%200%201-2.69%205.08%2042%2042%200%200%201-4.5%206c-7.68%208.49-33.75%2023.63-43.36%2029.79l-21.33%2013c-15.63%209.63-30.41%2016.45-49%2016.91h-2.6c-1.2%200-2.39%200-3.57-.07a92.86%2092.86%200%200%201-74.92-43.17%2091.6%2091.6%200%200%201-13.68-38.67%2041.13%2041.13%200%200%200%2060%2028.95l.14-.07%202.09-1.25%208.49-5%2010.81-6.4v-.3l1.39-.83%2096.71-57.29%207.44-4.41.74.25h.09a38.3%2038.3%200%200%201%206.22%202.14%2041.5%2041.5%200%200%201%2012.36%208.28%2040%2040%200%200%201%204%204.43%2037%2037%200%200%201%202.85%204.17%2041.64%2041.64%200%200%201%205.87%2021.55%22%20style%3D%22fill%3Aurl(%23c)%22%20transform%3D%22translate(-163%20-82.94)%22%2F%3E%3Cpath%20d%3D%22M245.24%20147.35v213.29L234.39%20367l-8.5%205-2.09%201.27a.24.24%200%200%200-.13.06%2041.13%2041.13%200%200%201-60-28.94c-.16-.89-.28-1.81-.38-2.7-.13-1.68-.22-3.33-.25-5v-240a13.77%2013.77%200%200%201%2021.46-11.41l42.07%2027.48a5.6%205.6%200%200%200%20.73.51%2041.14%2041.14%200%200%201%2017.94%2034.08%22%20style%3D%22fill%3Aurl(%23d)%22%20transform%3D%22translate(-163%20-82.94)%22%2F%3E%3Cg%20style%3D%22opacity%3A.14900000393390656%3Bisolation%3Aisolate%22%3E%3Cg%20style%3D%22clip-path%3Aurl(%23e)%22%3E%3Cpath%20d%3D%22M382.91%20338.56a43%2043%200%200%201-.72%207.82c-.14.67-.28%201.35-.44%202-.3%201.2-.62%202.36-1%203.53-.21.6-.42%201.2-.65%201.78s-.49%201.18-.74%201.78a38%2038%200%200%201-2.69%205.08%2042%2042%200%200%201-4.5%206c-7.68%208.49-33.75%2023.63-43.36%2029.79l-21.33%2013c-15.63%209.63-30.41%2016.45-49%2016.91h-2.6c-1.2%200-2.39%200-3.57-.07a92.86%2092.86%200%200%201-74.92-43.17%2091.6%2091.6%200%200%201-13.68-38.67%2041.13%2041.13%200%200%200%2060%2028.95l.14-.07%202.09-1.25%208.49-5%2010.81-6.4v-.3l1.39-.83%2096.71-57.29%207.44-4.41.74.25h.09a38.3%2038.3%200%200%201%206.22%202.14%2041.5%2041.5%200%200%201%2012.36%208.28%2040%2040%200%200%201%204%204.43%2037%2037%200%200%201%202.85%204.17%2041.64%2041.64%200%200%201%205.87%2021.55%22%20style%3D%22fill%3Aurl(%23a)%22%20transform%3D%22translate(-163%20-82.94)%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3Cg%20style%3D%22opacity%3A.09799999743700027%3Bisolation%3Aisolate%22%3E%3Cg%20style%3D%22clip-path%3Aurl(%23g)%22%3E%3Cpath%20d%3D%22M245.24%20147.35v213.29L234.39%20367l-8.5%205-2.09%201.27a.24.24%200%200%200-.13.06%2041.13%2041.13%200%200%201-60-28.94c-.16-.89-.28-1.81-.38-2.7-.13-1.68-.22-3.33-.25-5v-240a13.77%2013.77%200%200%201%2021.46-11.41l42.07%2027.48a5.6%205.6%200%200%200%20.73.51%2041.14%2041.14%200%200%201%2017.94%2034.08%22%20style%3D%22fill%3Aurl(%23h)%22%20transform%3D%22translate(-163%20-82.94)%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E";
export const CHATGPT_SVG = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20viewBox%3D%220%200%202406%202406%22%3E%0A%09%3Cpath%20d%3D%22M1%20578.4C1%20259.5%20259.5%201%20578.4%201h1249.1c319%200%20577.5%20258.5%20577.5%20577.4V2406H578.4C259.5%202406%201%202147.5%201%201828.6V578.4z%22%20fill%3D%22%2374aa9c%22%2F%3E%0A%09%3Cpath%20id%3D%22a%22%20d%3D%22M1107.3%20299.1c-197.999%200-373.9%20127.3-435.2%20315.3L650%20743.5v427.9c0%2021.4%2011%2040.4%2029.4%2051.4l344.5%20198.515V833.3h.1v-27.9L1372.7%20604c33.715-19.52%2070.44-32.857%20108.47-39.828L1447.6%20450.3C1361%20353.5%201237.1%20298.5%201107.3%20299.1zm0%20117.5-.6.6c79.699%200%20156.3%2027.5%20217.6%2078.4-2.5%201.2-7.4%204.3-11%206.1L952.8%20709.3c-18.4%2010.4-29.4%2030-29.4%2051.4V1248l-155.1-89.4V755.8c-.1-187.099%20151.601-338.9%20339-339.2z%22%20fill%3D%22%23fff%22%2F%3E%0A%09%3Cuse%20xlink%3Ahref%3D%22%23a%22%20transform%3D%22rotate(60%201203%201203)%22%2F%3E%0A%20%20%09%3Cuse%20xlink%3Ahref%3D%22%23a%22%20transform%3D%22rotate(120%201203%201203)%22%2F%3E%0A%09%3Cuse%20xlink%3Ahref%3D%22%23a%22%20transform%3D%22rotate(180%201203%201203)%22%2F%3E%0A%09%3Cuse%20xlink%3Ahref%3D%22%23a%22%20transform%3D%22rotate(240%201203%201203)%22%2F%3E%0A%09%3Cuse%20xlink%3Ahref%3D%22%23a%22%20transform%3D%22rotate(300%201203%201203)%22%2F%3E%0A%0A%3C%2Fsvg%3E";
export const PERPLEXITY_SVG = "data:image/svg+xml,%3Csvg%20height%3D%221em%22%20style%3D%22flex%3Anone%3Bline-height%3A1%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%221em%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ctitle%3EPerplexity%3C%2Ftitle%3E%3Cpath%20d%3D%22M19.785%200v7.272H22.5V17.62h-2.935V24l-7.037-6.194v6.145h-1.091v-6.152L4.392%2024v-6.465H1.5V7.188h2.884V0l7.053%206.494V.19h1.09v6.49L19.786%200zm-7.257%209.044v7.319l5.946%205.234V14.44l-5.946-5.397zm-1.099-.08l-5.946%205.398v7.235l5.946-5.234V8.965zm8.136%207.58h1.844V8.349H13.46l6.105%205.54v2.655zm-8.982-8.28H2.59v8.195h1.8v-2.576l6.192-5.62zM5.475%202.476v4.71h5.115l-5.115-4.71zm13.219%200l-5.115%204.71h5.115v-4.71z%22%20fill%3D%22%2322B8CD%22%20fill-rule%3D%22nonzero%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E";
export const CLAUDE_SVG = "data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%3F%3E%0A%3C!--%20Generated%20by%20Pixelmator%20Pro%203.6.17%20--%3E%0A%3Csvg%20width%3D%221200%22%20height%3D%221200%22%20viewBox%3D%220%200%201200%201200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%20%20%20%20%3Cg%20id%3D%22g314%22%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20id%3D%22path147%22%20fill%3D%22%23d97757%22%20stroke%3D%22none%22%20d%3D%22M%20233.959793%20800.214905%20L%20468.644287%20668.536987%20L%20472.590637%20657.100647%20L%20468.644287%20650.738403%20L%20457.208069%20650.738403%20L%20417.986633%20648.322144%20L%20283.892639%20644.69812%20L%20167.597321%20639.865845%20L%2054.926208%20633.825623%20L%2026.577238%20627.785339%20L%203.3e-05%20592.751709%20L%202.73832%20575.27533%20L%2026.577238%20559.248352%20L%2060.724873%20562.228149%20L%20136.187973%20567.382629%20L%20249.422867%20575.194763%20L%20331.570496%20580.026978%20L%20453.261841%20592.671082%20L%20472.590637%20592.671082%20L%20475.328857%20584.859009%20L%20468.724915%20580.026978%20L%20463.570557%20575.194763%20L%20346.389313%20495.785217%20L%20219.543671%20411.865906%20L%20153.100723%20363.543762%20L%20117.181267%20339.060425%20L%2099.060455%20316.107361%20L%2091.248367%20266.01355%20L%20123.865784%20230.093994%20L%20167.677887%20233.073853%20L%20178.872513%20236.053772%20L%20223.248367%20270.201477%20L%20318.040283%20343.570496%20L%20441.825592%20434.738342%20L%20459.946411%20449.798706%20L%20467.194672%20444.64447%20L%20468.080597%20441.020203%20L%20459.946411%20427.409485%20L%20392.617493%20305.718323%20L%20320.778564%20181.932983%20L%20288.80542%20130.630859%20L%20280.348999%2099.865845%20C%20277.369171%2087.221436%20275.194641%2076.590698%20275.194641%2063.624268%20L%20312.322174%2013.20813%20L%20332.8591%206.604126%20L%20382.389313%2013.20813%20L%20403.248352%2031.328979%20L%20434.013519%20101.71814%20L%20483.865753%20212.537048%20L%20561.181274%20363.221497%20L%20583.812134%20407.919434%20L%20595.892639%20449.315491%20L%20600.40271%20461.959839%20L%20608.214783%20461.959839%20L%20608.214783%20454.711609%20L%20614.577271%20369.825623%20L%20626.335632%20265.61084%20L%20637.771851%20131.516846%20L%20641.718201%2093.745117%20L%20660.402832%2048.483276%20L%20697.530334%2024.000122%20L%20726.52356%2037.852417%20L%20750.362549%2072%20L%20747.060486%2094.067139%20L%20732.886047%20186.201416%20L%20705.100708%20330.52356%20L%20686.979919%20427.167847%20L%20697.530334%20427.167847%20L%20709.61084%20415.087341%20L%20758.496704%20350.174561%20L%20840.644348%20247.490051%20L%20876.885925%20206.738342%20L%20919.167847%20161.71814%20L%20946.308838%20140.29541%20L%20997.61084%20140.29541%20L%201035.38269%20196.429626%20L%201018.469849%20254.416199%20L%20965.637634%20321.422852%20L%20921.825562%20378.201538%20L%20859.006714%20462.765259%20L%20819.785278%20530.41626%20L%20823.409424%20535.812073%20L%20832.75177%20534.92627%20L%20974.657776%20504.724915%20L%201051.328979%20490.872559%20L%201142.818848%20475.167786%20L%201184.214844%20494.496582%20L%201188.724854%20514.147644%20L%201172.456421%20554.335693%20L%201074.604126%20578.496765%20L%20959.838989%20601.449829%20L%20788.939636%20641.879272%20L%20786.845764%20643.409485%20L%20789.261841%20646.389343%20L%20866.255127%20653.637634%20L%20899.194702%20655.409424%20L%20979.812134%20655.409424%20L%201129.932861%20666.604187%20L%201169.154419%20692.537109%20L%201192.671265%20724.268677%20L%201188.724854%20748.429688%20L%201128.322144%20779.194641%20L%201046.818848%20759.865845%20L%20856.590759%20714.604126%20L%20791.355774%20698.335754%20L%20782.335693%20698.335754%20L%20782.335693%20703.731567%20L%20836.69812%20756.885986%20L%20936.322205%20846.845581%20L%201061.073975%20962.81897%20L%201067.436279%20991.490112%20L%201051.409424%201014.120911%20L%201034.496704%201011.704712%20L%20924.885986%20929.234924%20L%20882.604126%20892.107544%20L%20786.845764%20811.48999%20L%20780.483276%20811.48999%20L%20780.483276%20819.946289%20L%20802.550415%20852.241699%20L%20919.087341%201027.409424%20L%20925.127625%201081.127686%20L%20916.671204%201098.604126%20L%20886.469849%201109.154419%20L%20853.288696%201103.114136%20L%20785.073914%201007.355835%20L%20714.684631%20899.516785%20L%20657.906067%20802.872498%20L%20650.979858%20806.81897%20L%20617.476624%201167.704834%20L%20601.771851%201186.147705%20L%20565.530212%201200%20L%20535.328857%201177.046997%20L%20519.302124%201139.919556%20L%20535.328857%201066.550537%20L%20554.657776%20970.792053%20L%20570.362488%20894.68457%20L%20584.536926%20800.134277%20L%20592.993347%20768.724976%20L%20592.429626%20766.630859%20L%20585.503479%20767.516968%20L%20514.22821%20865.369263%20L%20405.825531%201011.865906%20L%20320.053711%201103.677979%20L%20299.516815%201111.812256%20L%20263.919525%201093.369263%20L%20267.221497%201060.429688%20L%20287.114136%201031.114136%20L%20405.825531%20880.107361%20L%20477.422913%20786.52356%20L%20523.651062%20732.483276%20L%20523.328918%20724.671265%20L%20520.590698%20724.671265%20L%20205.288605%20929.395935%20L%20149.154434%20936.644409%20L%20124.993355%20914.01355%20L%20127.973183%20876.885986%20L%20139.409409%20864.80542%20L%20234.201385%20799.570435%20L%20233.879227%20799.8927%20Z%22%2F%3E%0A%20%20%20%20%3C%2Fg%3E%0A%3C%2Fsvg%3E";
export const ROBOT_AI_SVG = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2048%2048%22%20width%3D%2248%22%20height%3D%2248%22%3E%0A%20%20%3Cdefs%3E%0A%20%20%20%20%3ClinearGradient%20id%3D%22robotAiBg%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%234F46E5%22%20%2F%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%2250%25%22%20stop-color%3D%22%237C3AED%22%20%2F%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%239333EA%22%20%2F%3E%0A%20%20%20%20%3C%2FlinearGradient%3E%0A%20%20%20%20%3ClinearGradient%20id%3D%22robotAiFace%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%220%25%22%20y2%3D%22100%25%22%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%230F172A%22%20%2F%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%231E293B%22%20%2F%3E%0A%20%20%20%20%3C%2FlinearGradient%3E%0A%20%20%20%20%3ClinearGradient%20id%3D%22robotAiGlow%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%220%25%22%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%2338BDF8%22%20%2F%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%2322D3EE%22%20%2F%3E%0A%20%20%20%20%3C%2FlinearGradient%3E%0A%20%20%3C%2Fdefs%3E%0A%20%20%3C!--%20Background%20Chassis%20--%3E%0A%20%20%3Crect%20x%3D%222%22%20y%3D%222%22%20width%3D%2244%22%20height%3D%2244%22%20rx%3D%2212%22%20fill%3D%22url(%23robotAiBg)%22%20%2F%3E%0A%20%20%3C!--%20Signal%20router%20waves%20on%20top%20--%3E%0A%20%20%3Cpath%20d%3D%22M19%2010%20A%208%208%200%200%201%2029%2010%22%20stroke%3D%22%2338BDF8%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20fill%3D%22none%22%20opacity%3D%220.9%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M15%207%20A%2013%2013%200%200%201%2033%207%22%20stroke%3D%22%23E0E7FF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20fill%3D%22none%22%20opacity%3D%220.6%22%2F%3E%0A%20%20%3C!--%20Center%20Router%20Antenna%20--%3E%0A%20%20%3Cline%20x1%3D%2224%22%20y1%3D%2211%22%20x2%3D%2224%22%20y2%3D%2215%22%20stroke%3D%22%23FFFFFF%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%2224%22%20cy%3D%2211%22%20r%3D%222%22%20fill%3D%22%2338BDF8%22%2F%3E%0A%20%20%3C!--%20Bot%20Head%20Screen%20%2F%20Face%20--%3E%0A%20%20%3Crect%20x%3D%229%22%20y%3D%2216%22%20width%3D%2230%22%20height%3D%2224%22%20rx%3D%227%22%20fill%3D%22url(%23robotAiFace)%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.2)%22%20stroke-width%3D%221.5%22%2F%3E%0A%20%20%3C!--%20Visor%20%2F%20Eyes%20--%3E%0A%20%20%3Crect%20x%3D%2214%22%20y%3D%2222%22%20width%3D%227%22%20height%3D%224.5%22%20rx%3D%222.25%22%20fill%3D%22url(%23robotAiGlow)%22%2F%3E%0A%20%20%3Crect%20x%3D%2227%22%20y%3D%2222%22%20width%3D%227%22%20height%3D%224.5%22%20rx%3D%222.25%22%20fill%3D%22url(%23robotAiGlow)%22%2F%3E%0A%20%20%3C!--%20Router%20Node%20%2F%20Mouth%20Grid%20--%3E%0A%20%20%3Cpath%20d%3D%22M18%2032%20H30%22%20stroke%3D%22%2338BDF8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20opacity%3D%220.85%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%2221%22%20cy%3D%2232%22%20r%3D%221%22%20fill%3D%22%23FFFFFF%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%2227%22%20cy%3D%2232%22%20r%3D%221%22%20fill%3D%22%23FFFFFF%22%2F%3E%0A%20%20%3C!--%20Ear%20Antenna%20Plugs%20--%3E%0A%20%20%3Crect%20x%3D%226%22%20y%3D%2223%22%20width%3D%223%22%20height%3D%228%22%20rx%3D%221.5%22%20fill%3D%22%23C7D2FE%22%2F%3E%0A%20%20%3Crect%20x%3D%2239%22%20y%3D%2223%22%20width%3D%223%22%20height%3D%228%22%20rx%3D%221.5%22%20fill%3D%22%23C7D2FE%22%2F%3E%0A%3C%2Fsvg%3E";

export const SEARCH_ENGINE_METADATA = {
    google: { name: 'Google', icon: GOOGLE_COLOR_G_SVG, placeholder: 'Search the web' },
    brave: { name: 'Brave', icon: BRAVE_SVG, placeholder: 'Search the web with Brave' },
    duckduckgo: { name: 'DuckDuckGo', icon: DUCKDUCKGO_SVG, placeholder: 'Search privately with DuckDuckGo' },
    bing: { name: 'Bing', icon: BING_SVG, placeholder: 'Search the web with Bing' },
    chatgpt: { name: 'ChatGPT', icon: CHATGPT_SVG, placeholder: 'Ask ChatGPT anything...' },
    perplexity: { name: 'Perplexity', icon: PERPLEXITY_SVG, placeholder: 'Ask Perplexity anything...' },
    claude: { name: 'Claude', icon: CLAUDE_SVG, placeholder: 'Talk to Claude...' },
    robot_ai: { name: 'Robot AI', icon: ROBOT_AI_SVG, isRobot: true, placeholder: 'Ask AI or search (Auto-routed)...' },
    custom_engine: { name: 'Custom', icon: GOOGLE_COLOR_G_SVG, placeholder: 'Search custom engine...' }
};

export function updateSearchEngineUI() {
    const engine = state.settings.searchEngine || 'google';
    const meta = SEARCH_ENGINE_METADATA[engine] || SEARCH_ENGINE_METADATA.google;

    if (dom.searchEngineCurrentIcon) {
        dom.searchEngineCurrentIcon.style.display = 'block';
        dom.searchEngineCurrentIcon.src = meta.icon;
        dom.searchEngineCurrentIcon.alt = meta.name;
        const robotSpan = dom.searchEngineBtn?.querySelector('.engine-icon-robot');
        if (robotSpan) robotSpan.style.display = 'none';
    }

    if (dom.searchInput) {
        dom.searchInput.placeholder = meta.placeholder;
    }

    if (dom.searchEngineMenu) {
        dom.searchEngineMenu.querySelectorAll('.engine-menu-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.engine === engine);
        });
    }

    // Toggle Google-specific UI options dynamically
    const isGoogle = engine === 'google';
    if (dom.searchContainer) {
        dom.searchContainer.classList.toggle('google-active', isGoogle);
    }
    if (dom.searchForm) {
        dom.searchForm.setAttribute('data-engine', engine);
    }
    if (dom.searchPlusBtn) {
        dom.searchPlusBtn.style.display = isGoogle ? 'flex' : 'none';
    }
    if (dom.searchPlusMenu && !isGoogle) {
        dom.searchPlusMenu.classList.add('hidden');
        dom.searchPlusBtn?.classList.remove('open');
    }
    if (dom.googleSearchActions) {
        dom.googleSearchActions.style.display = isGoogle ? 'flex' : 'none';
    }
    if (dom.searchLensBtn) {
        dom.searchLensBtn.style.display = isGoogle ? 'flex' : 'none';
    }
}

export function resolveSearch(rawQuery) {
    const query = rawQuery.trim();
    if (!query) return { url: '', engine: 'google', cleanQuery: '' };

    const engine = state.settings.searchEngine;
    
    // Default URLs
    const urls = {
        google: 'https://www.google.com/search?q=%s',
        duckduckgo: 'https://duckduckgo.com/?q=%s',
        bing: 'https://www.bing.com/search?q=%s',
        brave: 'https://search.brave.com/search?q=%s',
        chatgpt: 'https://chatgpt.com/?q=%s',
        perplexity: 'https://www.perplexity.ai/search?q=%s',
        claude: 'https://claude.ai/?q=%s',
        gemini: 'https://gemini.google.com/app?q=%s',
    };

    if (engine === 'custom_engine') {
        const base = state.settings.customSearchUrl || 'https://www.google.com/search?q=%s';
        return { url: base.replace('%s', encodeURIComponent(query)), engine: 'custom', cleanQuery: query };
    }

    if (engine !== 'robot_ai') {
        const base = urls[engine] || urls.google;
        return { url: base.replace('%s', encodeURIComponent(query)), engine, cleanQuery: query };
    }

    // --- Robot AI Router Logic ---
    // 1. Check for slash overrides
    let targetEngine = null;
    let cleanQuery = query;

    if (query.startsWith('/')) {
        const parts = query.split(/\s+/);
        const command = parts[0].toLowerCase();
        const rest = parts.slice(1).join(' ');

        const slashMap = {
            '/gpt': 'chatgpt',
            '/chatgpt': 'chatgpt',
            '/claude': 'claude',
            '/gemini': 'gemini',
            '/gem': 'gemini',
            '/perp': 'perplexity',
            '/perplexity': 'perplexity',
            '/g': 'google',
            '/google': 'google',
            '/b': 'bing',
            '/bing': 'bing',
            '/ddg': 'duckduckgo',
            '/duck': 'duckduckgo',
            '/brave': 'brave'
        };

        if (slashMap[command]) {
            targetEngine = slashMap[command];
            cleanQuery = rest;
        }
    }

    // 2. Heuristics fallback if no slash command matched
    if (!targetEngine) {
        const lower = query.toLowerCase();
        
        // List of programming keywords
        const codingKeywords = [
            'code', 'run', 'error', 'bug', 'class', 'function', 'api', 'npm', 'git', 
            'python', 'javascript', 'typescript', 'rust', 'java', 'c++', 'html', 'css', 
            'sql', 'docker', 'kubernetes', 'json', 'compiler', 'syntax', 'array', 
            'hashmap', 'pointer', 'regex', 'install', 'setup', 'write a function',
            'programming', 'algorithm', 'binary search', 'recursion'
        ];

        // List of research keywords/phrases
        const researchKeywords = [
            'why does', 'explain the', 'history of', 'difference between', 'scientific', 
            'statistics', 'evidence', 'mechanism of', 'how does', 'compare and', 
            'what is the meaning of', 'concept of', 'literature on', 'theoretical'
        ];

        const isCoding = codingKeywords.some(kw => lower.includes(kw));
        const isResearch = researchKeywords.some(kw => lower.includes(kw));
        const wordCount = query.split(/\s+/).length;

        if (isCoding) {
            targetEngine = 'claude';
        } else if (isResearch || wordCount >= 6) {
            targetEngine = 'perplexity';
        } else {
            targetEngine = 'google';
        }
    }

    const base = urls[targetEngine] || urls.google;
    return { url: base.replace('%s', encodeURIComponent(cleanQuery)), engine: targetEngine, cleanQuery };
}

export function setupSearch() {
    let selectedIndex = -1;
    let isAiMode = false;

    if (dom.searchInput) {
        const executeSearchUrl = (url) => {
            if (!url) return;
            try {
                const inNewTab = Boolean(state.settings.openSearchInNewTab);
                if (inNewTab) {
                    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
                        chrome.tabs.create({ url });
                        return;
                    }
                    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
                        chrome.runtime.sendMessage({ action: 'open_tab', url });
                        return;
                    }
                    window.open(url, '_blank');
                    return;
                }

                if (typeof chrome !== 'undefined' && chrome.tabs?.update) {
                    if (chrome.tabs.getCurrent) {
                        chrome.tabs.getCurrent((tab) => {
                            if (tab && tab.id) {
                                chrome.tabs.update(tab.id, { url });
                            } else {
                                chrome.tabs.update({ url });
                            }
                        });
                    } else {
                        chrome.tabs.update({ url });
                    }
                    return;
                }
                window.location.assign(url);
            } catch (err) {
                console.warn('[Search] Navigation fallback error:', err);
                window.location.href = url;
            }
        };

        const handleSearch = (query) => {
            const rawQuery = (query || '').trim();
            const engine = state.settings.searchEngine || 'google';

            if (!rawQuery) {
                const homepages = {
                    google: 'https://www.google.com',
                    brave: 'https://search.brave.com',
                    duckduckgo: 'https://duckduckgo.com',
                    bing: 'https://www.bing.com',
                    chatgpt: 'https://chatgpt.com',
                    perplexity: 'https://www.perplexity.ai',
                    claude: 'https://claude.ai',
                    robot_ai: 'https://www.google.com',
                    custom_engine: 'https://www.google.com'
                };
                const homepage = homepages[engine] || 'https://www.google.com';
                executeSearchUrl(homepage);
                return;
            }

            let targetUrl = '';

            if (isAiMode && engine === 'google') {
                const model = state.settings.activeAiModel || 'auto';
                if (model === 'pro') {
                    targetUrl = `https://gemini.google.com/app?q=${encodeURIComponent(rawQuery)}`;
                } else {
                    targetUrl = `https://www.google.com/search?q=${encodeURIComponent(rawQuery)}&udm=14`;
                }
            } else {
                const res = resolveSearch(rawQuery);
                targetUrl = res.url;
            }

            executeSearchUrl(targetUrl);
        };

        let debounceTimer = null;
        let latestQuerySeq = 0;
        let activeSearchController = null;

        dom.searchInput.oninput = (e) => {
            const queryRaw = e.target.value;
            let query = queryRaw.trim();
            selectedIndex = -1;
            
            if (!query) {
                if (dom.searchSuggestions) {
                    dom.searchSuggestions.classList.add('hidden');
                    dom.searchSuggestions.innerHTML = '';
                }
                return;
            }

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                const currentSeq = ++latestQuerySeq;

                // Strip slash command prefix for autocomplete queries
                if (query.startsWith('/')) {
                    const parts = query.split(/\s+/);
                    if (parts.length > 1) {
                        query = parts.slice(1).join(' ');
                    } else {
                        if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
                        return;
                    }
                }

                if (activeSearchController) {
                    activeSearchController.abort();
                }
                activeSearchController = new AbortController();

                try {
                    const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`, {
                        signal: activeSearchController.signal
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    if (currentSeq !== latestQuerySeq) return; // Discard stale responses
                    const data = await res.json();
                    const suggestions = (data[1] || []).slice(0, 6);
                    if (currentSeq !== latestQuerySeq) return;

                    if (dom.searchSuggestions) {
                        dom.searchSuggestions.innerHTML = suggestions.map((s, i) => `
                            <li class="suggestion-item" data-index="${i}">
                                <svg viewBox="0 0 24 24" width="16" height="16" style="opacity:0.5"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/></svg>
                                <span>${escapeHTML(s)}</span>
                            </li>`).join('');
                        dom.searchSuggestions.classList.toggle('hidden', suggestions.length === 0);
                    }
                } catch (err) { 
                    if (err.name !== 'AbortError') console.warn('Suggest error', err);
                }
            }, 180);
        };

        if (dom.searchSuggestions && !dom.searchSuggestions._hasListener) {
            dom.searchSuggestions._hasListener = true;
            dom.searchSuggestions.onclick = (e) => {
                const li = e.target.closest('.suggestion-item');
                if (li) {
                    const text = (li.querySelector('span')?.textContent || '').trim();
                    if (text) {
                        handleSearch(text);
                        dom.searchInput.value = '';
                        if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
                        dom.searchInput.blur();
                        deactivateSearch();
                    }
                }
            };
        }

        dom.searchInput.onkeydown = (e) => {
            if (e.key === 'Escape') {
                if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
                dom.searchInput.blur();
                deactivateSearch();
                return;
            }

            const items = dom.searchSuggestions ? dom.searchSuggestions.querySelectorAll('.suggestion-item') : [];

            if (e.key === 'ArrowDown') {
                if (items.length > 0) {
                    e.preventDefault();
                    selectedIndex = (selectedIndex + 1) % items.length;
                    updateSelection(items);
                }
            } else if (e.key === 'ArrowUp') {
                if (items.length > 0) {
                    e.preventDefault();
                    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                    updateSelection(items);
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                let query = '';
                if (selectedIndex > -1 && items[selectedIndex]) {
                    query = (items[selectedIndex].querySelector('span')?.textContent || '').trim();
                }
                if (!query) {
                    query = dom.searchInput.value.trim();
                }
                if (query) {
                    handleSearch(query);
                    dom.searchInput.value = '';
                    if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
                    dom.searchInput.blur();
                    deactivateSearch();
                }
            }
        };

        // Smooth interactive position animation for search bar (activated when text cursor/focus is inside)
        const activateSearch = () => {
            dom.searchContainer?.classList.add('search-active');
            document.body.classList.add('search-focused');
        };

        const deactivateSearch = () => {
            dom.searchContainer?.classList.remove('search-active');
            document.body.classList.remove('search-focused');
        };

        if (dom.searchContainer) {
            dom.searchContainer.addEventListener('click', (e) => {
                if (e.target.closest('button, a, input, select, label, .search-plus-menu, .search-engine-menu, .suggestions-dropdown, #google-search-actions')) {
                    return;
                }
                if (dom.searchInput && document.activeElement !== dom.searchInput) {
                    dom.searchInput.focus();
                }
            });
        }

        if (dom.searchInput) {
            dom.searchInput.addEventListener('focus', activateSearch);
            dom.searchInput.addEventListener('blur', () => {
                setTimeout(() => {
                    if (document.activeElement !== dom.searchInput) {
                        deactivateSearch();
                    }
                }, 120);
            });
        }

        function updateSelection(items) {
            items.forEach((item, i) => {
                item.classList.toggle('selected', i === selectedIndex);
                if (i === selectedIndex) {
                    dom.searchInput.value = item.querySelector('span')?.textContent || '';
                }
            });
        }

        dom.searchForm.onsubmit = (e) => {
            e.preventDefault();
            const query = dom.searchInput?.value.trim() || '';
            handleSearch(query);
            if (query && dom.searchInput) {
                dom.searchInput.value = '';
                if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
                dom.searchInput.blur();
                deactivateSearch();
            }
        };

        if (dom.searchSubmitBtn) {
            dom.searchSubmitBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const query = dom.searchInput?.value.trim() || '';
                handleSearch(query);
                if (query && dom.searchInput) {
                    dom.searchInput.value = '';
                    if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
                    dom.searchInput.blur();
                    deactivateSearch();
                }
            };
        }

        // Google Search Plus (+) Button & Floating Popup Menu
        if (dom.searchPlusBtn && dom.searchPlusMenu) {
            dom.searchPlusBtn.onclick = (e) => {
                e.stopPropagation();
                const isHidden = dom.searchPlusMenu.classList.contains('hidden');
                dom.searchPlusMenu.classList.toggle('hidden', !isHidden);
                dom.searchPlusBtn.classList.toggle('open', isHidden);
                dom.searchEngineMenu?.classList.add('hidden');
                dom.searchEngineBtn?.classList.remove('open');
                if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
            };

            const addImagesBtn = document.getElementById('plus-action-images');
            if (addImagesBtn) {
                addImagesBtn.onclick = (e) => {
                    e.stopPropagation();
                    dom.searchPlusMenu.classList.add('hidden');
                    dom.searchPlusBtn.classList.remove('open');
                    dom.searchImageFileInput?.click();
                };
            }

            const addFilesBtn = document.getElementById('plus-action-files');
            if (addFilesBtn) {
                addFilesBtn.onclick = (e) => {
                    e.stopPropagation();
                    dom.searchPlusMenu.classList.add('hidden');
                    dom.searchPlusBtn.classList.remove('open');
                    dom.searchDocFileInput?.click();
                };
            }

            const createImagesBtn = document.getElementById('plus-action-create');
            if (createImagesBtn) {
                createImagesBtn.onclick = (e) => {
                    e.stopPropagation();
                    dom.searchPlusMenu.classList.add('hidden');
                    dom.searchPlusBtn.classList.remove('open');
                    if (dom.searchInput) {
                        dom.searchInput.value = 'Create image of ';
                        dom.searchInput.focus();
                        dom.searchInput.setSelectionRange(dom.searchInput.value.length, dom.searchInput.value.length);
                    }
                };
            }

            dom.searchPlusMenu.querySelectorAll('.plus-model-item').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    dom.searchPlusMenu.querySelectorAll('.plus-model-item').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const model = btn.dataset.model || 'auto';
                    state.settings.activeAiModel = model;
                    saveSettings(state.settings);
                    dom.searchPlusMenu.classList.add('hidden');
                    dom.searchPlusBtn.classList.remove('open');

                    if (dom.searchInput) {
                        if (model === 'flash') {
                            dom.searchInput.placeholder = 'Search with 3.8 Flash...';
                        } else if (model === 'pro') {
                            dom.searchInput.placeholder = 'Search with Gemini Pro...';
                        } else {
                            dom.searchInput.placeholder = 'Search the web';
                        }
                        dom.searchInput.focus();
                    }
                };
            });
        }

        // Hidden file inputs
        if (dom.searchImageFileInput) {
            dom.searchImageFileInput.onchange = (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    if (dom.searchInput) {
                        dom.searchInput.value = `Image: ${file.name}`;
                    }
                    executeSearchUrl('https://lens.google.com/');
                }
            };
        }

        if (dom.searchDocFileInput) {
            dom.searchDocFileInput.onchange = (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    if (dom.searchInput) {
                        dom.searchInput.value = `Analyze file: ${file.name}`;
                        dom.searchInput.focus();
                    }
                    isAiMode = true;
                    dom.searchAiModeBtn?.classList.add('active');
                    dom.searchForm?.classList.add('ai-mode-active');
                }
            };
        }

        // Voice Search with Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        let recognition = null;
        let isListening = false;
        if (SpeechRecognition) {
            try {
                recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                recognition.onstart = () => {
                    isListening = true;
                    dom.searchVoiceBtn?.classList.add('listening');
                    if (dom.searchInput) dom.searchInput.placeholder = 'Listening... Speak now';
                };

                recognition.onresult = (event) => {
                    const transcript = Array.from(event.results)
                        .map(r => r[0].transcript)
                        .join('');
                    if (dom.searchInput) {
                        dom.searchInput.value = transcript;
                    }
                };

                recognition.onerror = (e) => {
                    console.warn('Speech recognition notice:', e);
                    isListening = false;
                    dom.searchVoiceBtn?.classList.remove('listening');
                    if (e.error === 'not-allowed') {
                        if (dom.searchInput) dom.searchInput.placeholder = 'Microphone access denied';
                    }
                    setTimeout(() => updateSearchEngineUI(), 2000);
                };

                recognition.onend = () => {
                    isListening = false;
                    dom.searchVoiceBtn?.classList.remove('listening');
                    updateSearchEngineUI();
                    const query = dom.searchInput?.value.trim();
                    if (query) {
                        handleSearch(query);
                    }
                };
            } catch (err) {
                console.warn('Speech recognition init error:', err);
            }
        }

        if (dom.searchVoiceBtn) {
            dom.searchVoiceBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!recognition) {
                    if (dom.searchInput) {
                        dom.searchInput.placeholder = 'Speech recognition not supported in this browser';
                        setTimeout(() => updateSearchEngineUI(), 2000);
                    }
                    return;
                }
                if (isListening) {
                    try { recognition.stop(); } catch {}
                } else {
                    try {
                        recognition.start();
                    } catch (err) {
                        console.warn('Speech recognition failed to start:', err);
                        try { recognition.stop(); } catch {}
                    }
                }
            };
        }

        // Google Lens search
        if (dom.searchLensBtn) {
            dom.searchLensBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                executeSearchUrl('https://lens.google.com/');
            };
        }

        // AI Mode Toggle Pill
        if (dom.searchAiModeBtn) {
            dom.searchAiModeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                isAiMode = !isAiMode;
                dom.searchAiModeBtn.classList.toggle('active', isAiMode);
                dom.searchForm?.classList.toggle('ai-mode-active', isAiMode);
                if (isAiMode) {
                    if (dom.searchInput) {
                        dom.searchInput.placeholder = 'Ask Gemini or search with AI...';
                        dom.searchInput.focus();
                    }
                } else {
                    updateSearchEngineUI();
                }
            };
        }

        // Google Search action buttons below search bar
        if (dom.googleSearchSubmit) {
            dom.googleSearchSubmit.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const query = dom.searchInput?.value.trim() || '';
                handleSearch(query);
                if (query && dom.searchInput) {
                    dom.searchInput.value = '';
                    if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
                    dom.searchInput.blur();
                    deactivateSearch();
                }
            };
        }

        if (dom.googleLuckyBtn) {
            dom.googleLuckyBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const query = dom.searchInput?.value.trim();
                if (query) {
                    executeSearchUrl(`https://www.google.com/search?q=${encodeURIComponent(query)}&btnI=1`);
                    if (dom.searchInput) {
                        dom.searchInput.value = '';
                        if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
                        dom.searchInput.blur();
                        deactivateSearch();
                    }
                } else {
                    executeSearchUrl('https://www.google.com/doodles');
                }
            };
        }

        document.addEventListener('click', (e) => {
            if (!dom.searchContainer.contains(e.target)) {
                dom.searchSuggestions?.classList.add('hidden');
                dom.searchEngineMenu?.classList.add('hidden');
                dom.searchEngineBtn?.classList.remove('open');
                dom.searchPlusMenu?.classList.add('hidden');
                dom.searchPlusBtn?.classList.remove('open');
                deactivateSearch();
            }
        });

        // Search engine switcher button toggle
        if (dom.searchEngineBtn && dom.searchEngineMenu) {
            dom.searchEngineBtn.onclick = (e) => {
                e.stopPropagation();
                const isHidden = dom.searchEngineMenu.classList.contains('hidden');
                dom.searchEngineMenu.classList.toggle('hidden', !isHidden);
                dom.searchEngineBtn.classList.toggle('open', isHidden);
                dom.searchPlusMenu?.classList.add('hidden');
                dom.searchPlusBtn?.classList.remove('open');
                if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
            };

            // Select engine from dropdown
            dom.searchEngineMenu.querySelectorAll('.engine-menu-item').forEach(item => {
                item.onclick = (e) => {
                    e.stopPropagation();
                    const chosenEngine = item.dataset.engine;
                    if (chosenEngine) {
                        state.settings.searchEngine = chosenEngine;
                        saveSettings(state.settings);
                        updateSearchEngineUI();
                        // Sync settings modal radio buttons if open
                        const radio = document.querySelector(`input[name="search_engine"][value="${chosenEngine}"]`);
                        if (radio) radio.checked = true;
                    }
                    dom.searchEngineMenu.classList.add('hidden');
                    dom.searchEngineBtn.classList.remove('open');
                    dom.searchInput?.focus();
                };
            });

            // Customize list button -> open Settings Modal on Search Tab
            if (dom.customizeEnginesBtn) {
                dom.customizeEnginesBtn.onclick = (e) => {
                    e.stopPropagation();
                    dom.searchEngineMenu.classList.add('hidden');
                    dom.searchEngineBtn.classList.remove('open');
                    // Open settings modal
                    if (dom.modalOverlay) {
                        dom.modalOverlay.classList.remove('hidden');
                        // Switch to Search tab
                        dom.sidebarTabs.forEach(t => t.classList.remove('active'));
                        dom.tabPanes.forEach(p => p.classList.remove('active'));
                        const searchTab = document.querySelector('.sidebar-tab[data-target="tab-search"]');
                        const searchPane = document.getElementById('tab-search');
                        if (searchTab && searchPane) {
                            searchTab.classList.add('active');
                            searchPane.classList.add('active');
                        }
                    }
                };
            }
        }

        // Initialize UI state
        updateSearchEngineUI();
    }
}
