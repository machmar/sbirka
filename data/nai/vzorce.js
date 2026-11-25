/* Postranní panel „Vzorce a konstanty“: tahák z TAHAK.pdf + vybrané vzorce z „Co na tahák“. [popis, TeX] */
(function () {
const R = String.raw;
window.VZORCE = [
{g: "Konstanty", f: [
  ["Boltzmannova konstanta", R`k=1{,}38\cdot10^{-23}\,\text{J/K}`],
  ["náboj elektronu", R`q=1{,}602\cdot10^{-19}\,\text{C}`],
  ["teplotní napětí (≈ 26 mV při 300 K)", R`V_T=\frac{kT}{q}`],
  ["4kT při 300 K", R`4kT=1{,}656\cdot10^{-20}\,\text{J}`],
  ["napětí bandgapu", R`V_{BG}\approx1{,}25\,\text{V}`]
]},
{g: "Bipolární tranzistor", f: [
  ["základní rovnice", R`I_C=I_S\exp\frac{V_{BE}}{V_T}`],
  ["transkonduktance", R`g_m=\frac{I_C}{V_T}`],
  ["g_m s emitorovou degenerací", R`g_m=\frac{I_C}{R_EI_C+V_T}`],
  ["dif. stupeň: polovina / celý", R`g_m=\frac{I_{SS}}{4V_T}\;\;/\;\;g_m=\frac{I_{SS}}{2V_T}`]
]},
{g: "MOS tranzistor", f: [
  ["silná inverze", R`I_D=\frac{W}{2L}k_p(V_{GS}-V_{th})^2`],
  ["silná inverze: g_m", R`g_m=\sqrt{2I_Dk_p\frac{W}{L}}`],
  ["slabá inverze", R`I_D=I_{D0}\frac{W}{L}\exp\frac{V_{GS}}{nV_T}`],
  ["slabá inverze: g_m", R`g_m=\frac{I_D}{nV_T}`]
]},
{g: "Bandgap a PTAT", f: [
  ["rozdíl V_BE (plocha N : 1)", R`\Delta V_{BE}=V_T\ln N`],
  ["PTAT proud", R`I_{PTAT}=\frac{\Delta V_{BE}}{R}=\frac{V_T\ln N}{R}`],
  ["Brokawova reference", R`V_{BG}=V_{BE}+2\frac{R_2}{R_1}V_T\ln N`],
  ["Brokaw: návrh R₂", R`R_2=\frac{V_{BG}-V_{BE}}{2V_T\ln N}R_1`],
  ["násobky bandgapu", R`mV_{BE}+I_{PTAT}R=mV_{BG}`],
  ["nulový TC proudu přes R s TC", R`V_R=-\frac{TC(V_{BE})}{TC(R)}`]
]},
{g: "Kmitočet a OZ", f: [
  ["dominantní pól", R`f_0=\frac{1}{2\pi r_dC}`],
  ["dominantní pól (Millerův jev)", R`f_0=\frac{1}{2\pi r_dAC}`],
  ["tranzitní kmitočet", R`f_T=A_0f_0`],
  ["rychlost přeběhu", R`S_R=\frac{I_{SS}}{C}`],
  ["doublet", R`f_p=\frac{1}{2\pi R_1C_d},\;f_z=2f_p`]
]},
{g: "Časovače, komparátory, převodníky", f: [
  ["doba nabíjení", R`T=\frac{C\,\Delta V}{I}`],
  ["kmitočet a střída", R`f=\frac{1}{T_1+T_2},\;\;DC=\frac{T_H}{T_1+T_2}`],
  ["offset komparátoru (nesymetrie / úmyslný)", R`V_{OS}=V_T\ln(\text{poměr}),\;\;V_{OS}=IR`],
  ["V–I převodník", R`I_O=\frac{V_{IN}-V_{Ro}-mV_{BE}}{R_s}`],
  ["oscilátor řízený FB", R`I_{osc}=I_S+\frac{V_{FB}-V_{OS}}{R_s}\;(V_{FB}>V_{OS}),\;\;f=\frac{2I_{osc}}{5V_{ref}C_o}`]
]},
{g: "Nesouběh (σ)", f: [
  ["σ poměru proudů I₁/I₂ dvou paralelních BJT/MOS", R`\sigma_{I1/I2}`],
  ["σ odchylky proudu", R`\sigma_I=\sigma_{I1/I2}\,I_1\;\;(\text{dif. pár: }I_1=\tfrac{I_{SS}}{2})`],
  ["σ rozdílu V_BE dvou BJT v souběhu", R`\sigma_{\Delta V_{BE}}=V_T\,\sigma_{I1/I2}=\frac{\sigma_I}{g_m}`],
  ["σ rozdílu V_GS dvou MOS v souběhu", R`\sigma_{\Delta V_{GS}}=\frac{\sigma_I}{g_m}`],
  ["slabá inverze", R`\sigma_{V_{OS}}=\sigma_{I1/I2}\,nV_T`],
  ["superpozice", R`\sigma_o=\sqrt{\sum_{i=1}^{n}\sigma_i^2}`],
  ["dvoustupňový zesilovač", R`\sigma_{V_{OS}}=\sqrt{\sigma_{V_{OS1}}^2+\left(\frac{\sigma_{V_{OS2}}}{A_1}\right)^2}`],
  ["nesouběh kolektorových R u BJT páru", R`\sigma_{V_{OS}}\approx V_T\,\sigma_R`]
]},
{g: "Šum", f: [
  ["napěťový šum odporu", R`v_{nR}=\sqrt{4kTR}`],
  ["šumový proud v drainu MOS", R`i_{nd}=\sqrt{4kTg_m}`],
  ["šumový proud v kolektoru BJT", R`i_{nc}=\sqrt{2qI_C}`],
  ["vstupní šum BJT", R`v_{ni}=\sqrt{4kT\left(r_b+\frac{V_T}{2I_C}\right)}`],
  ["vstupní šum BJT páru s r_b", R`v_{ni}=\sqrt2\sqrt{4kT\left(r_b+\frac{V_T}{I_{SS}}\right)}`],
  ["přepočet šumu na vstup", R`v_{ni}=\frac{\sqrt{\sum i_n^2}}{g_m},\;\;v_{ni(2.st)}=\frac{v_{n2}}{A_1}`],
  ["integrální šum v pásmu", R`V_N=v_n\sqrt{f_2-f_1+f_K\ln\frac{f_2}{f_1}}`]
]}
];
/* karta Konstanty na stránce „Co na tahák“ (dřív natvrdo v core/app.js): [popisek HTML, hodnota] */
window.TAHAK_K = { t: "Konstanty (T = 300 K)", c: [["V<sub>T</sub>", "26 mV"], ["V<sub>BG</sub>", "1,25 V"], ["TC(V<sub>BE</sub>)", "−2 mV/K"], ["k", "1,38·10⁻²³ J/K"], ["q", "1,602·10⁻¹⁹ C"], ["4kT", "1,656·10⁻²⁰ J"]] };
})();
