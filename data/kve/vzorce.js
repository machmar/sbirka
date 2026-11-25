/* KVE: panel „Vzorce a konstanty“. */
(function () {
const R = String.raw;
window.VZORCE = [
  { g: "Konstanty", f: [
    ["rychlost světla", R`c = 299\,792\,458 \doteq 3\cdot10^{8}\ \mathrm{m/s}`],
    ["Planckova konstanta", R`h = 6{,}626\cdot10^{-34}\ \mathrm{J\,s},\ \hbar = \frac{h}{2\pi} = 1{,}0546\cdot10^{-34}\ \mathrm{J\,s}`],
    ["Boltzmannova konstanta", R`k = 1{,}38\cdot10^{-23}\ \mathrm{J/K}`],
    ["elementární náboj", R`e = 1{,}602\cdot10^{-19}\ \mathrm{C}`],
    ["klidová hmotnost elektronu", R`m_e = 9{,}11\cdot10^{-31}\ \mathrm{kg}`],
    ["Comptonova vlnová délka", R`\frac{h}{m_e c} = 2{,}43\cdot10^{-12}\ \mathrm{m}`]
  ]},
  { g: "Záření a foton", f: [
    ["energie fotonu", R`E_f = h\nu = h\frac{c}{\lambda} = \hbar\omega`],
    ["hybnost a hmotnost fotonu", R`p = \frac{h}{\lambda} = \hbar k,\quad m = \frac{h}{\lambda c}`],
    ["vlnové číslo", R`k = \frac{2\pi}{\lambda}`],
    ["index lomu", R`v = \frac{c}{n},\quad n = \sqrt{\varepsilon_r}`],
    ["Snellův zákon", R`n_1\sin\alpha = n_2\sin\beta`],
    ["výkon a intenzita", R`P = \frac{dE}{dt},\quad I = \frac{P}{S}`],
    ["šířka čáry", R`\Delta\lambda = \frac{c\,\Delta\nu}{\nu_1\nu_2}`]
  ]},
  { g: "Gaussův svazek", f: [
    ["Rayleighova vzdálenost", R`z_0 = \frac{k w_0^2}{2}`],
    ["pološířka", R`w(z) = w_0\sqrt{1+(z/z_0)^2}`],
    ["poloměr křivosti vlnoplochy", R`R(z) = z\left[1+(z_0/z)^2\right]`],
    ["úhel divergence", R`\theta = \frac{2}{k w_0}`],
    ["intenzita", R`I(x,y,z) = I_0\left[\frac{w_0}{w(z)}\right]^2 e^{-2\frac{x^2+y^2}{w^2(z)}},\quad I_0 = \frac{2P}{\pi w_0^2}`]
  ]},
  { g: "Kvantová mechanika a jevy", f: [
    ["fotoefekt", R`h\nu = h\nu_0 + \tfrac12 m_e v^2`],
    ["Comptonův jev", R`\Delta\lambda = \frac{h}{m_e c}(1-\cos\theta)`],
    ["relace neurčitosti", R`\Delta x\,\Delta p_x \ge \frac{\hbar}{2},\quad \Delta E\,\Delta t \ge \frac{\hbar}{2}`],
    ["Bohrův model (vodík)", R`E_n = -\frac{13{,}6\ \mathrm{eV}}{n^2}`],
    ["vlnová funkce", R`\Psi(\vec r,t) = A\exp\left[\frac{j}{\hbar}(\vec p\cdot\vec r - Et)\right]`],
    ["normovací podmínka", R`\int_V \psi\psi^*\,dV = 1`],
    ["střední hodnota", R`\langle F\rangle = \int_V \psi^* F \psi\,dV`],
    ["částice v krychli", R`p_x = \frac{\pi\hbar}{L}n_x`],
    ["vznik páru", R`2\gamma \to e^- + e^+,\quad E_f = m_e c^2`]
  ]},
  { g: "Polarizace (Jones)", f: [
    ["průchod prvky", R`J_2 = T_n\cdots T_2T_1J_1`],
    ["lineární x, y, 45°", R`\begin{pmatrix}1\\0\end{pmatrix},\ \begin{pmatrix}0\\1\end{pmatrix},\ \tfrac{1}{\sqrt2}\begin{pmatrix}1\\1\end{pmatrix}`],
    ["kruhová levotočivá / pravotočivá", R`\tfrac{1}{\sqrt2}\begin{pmatrix}1\\j\end{pmatrix},\ \tfrac{1}{\sqrt2}\begin{pmatrix}1\\-j\end{pmatrix}`],
    ["polarizátor x, y, 45°", R`\begin{pmatrix}1&0\\0&0\end{pmatrix},\ \begin{pmatrix}0&0\\0&1\end{pmatrix},\ \tfrac12\begin{pmatrix}1&1\\1&1\end{pmatrix}`],
    ["destička λ/4, λ/2", R`\begin{pmatrix}1&0\\0&-j\end{pmatrix},\ \begin{pmatrix}1&0\\0&-1\end{pmatrix}`]
  ]},
  { g: "Statistická rozdělení", f: [
    ["Fermi–Dirac", R`f(E) = \frac{1}{e^{\frac{E-\mu}{kT}}+1}`],
    ["Bose–Einstein", R`f(E) = \frac{1}{e^{\frac{E-\mu}{kT}}-1}`],
    ["Maxwell–Boltzmann", R`\langle N\rangle = e^{\frac{\mu-E}{kT}}`],
    ["Planck (μ = 0)", R`\langle N\rangle = \frac{1}{e^{\frac{\hbar\omega}{kT}}-1}`]
  ]},
  { g: "Rezonátory", f: [
    ["Fresnelovo číslo", R`N = \frac{a^2}{\lambda d}`],
    ["vzdálenost rezonančních čar", R`\nu_F = \frac{c}{2d}`],
    ["stabilita (konvence cvičení)", R`0 \le g_1g_2 \le 1,\quad g_i = 1+\frac{d}{R_i}`],
    ["ztráty na zrcadle", R`\alpha_m = \frac{1-R}{2d},\quad \alpha_r = \alpha_i+\alpha_{m1}+\alpha_{m2}+\alpha_{diff}`],
    ["finesse, šířka čáry, doba života", R`F = \frac{\pi}{\alpha_r d},\quad \delta\nu_F = \frac{c\,\alpha_r}{2\pi} = \frac{1}{2\pi\tau},\quad \tau = \frac{1}{c\,\alpha_r}`]
  ]},
  { g: "Teorie laseru", f: [
    ["ztráty na průchod", R`\gamma = \frac{\gamma_1+\gamma_2}{2}+\gamma_i`],
    ["prahová inverze", R`\Delta N_i^* = \frac{\gamma}{\sigma l}`],
    ["tříhladinový: buzení", R`W_{b\,min} = \frac{1}{\tau_{21}},\quad W_b^* = \frac{N_\Sigma+\Delta N_i^*}{N_\Sigma-\Delta N_i^*}\frac{1}{\tau_{21}}`],
    ["čtyřhladinový: buzení", R`W_{b\,min} = 0,\quad W_b^* = \frac{\Delta N_i^*}{N_\Sigma-\Delta N_i^*}\frac{1}{\tau_{21}}`],
    ["tříhladinový: výkon", R`P_L = \frac{V_f(N_\Sigma+\Delta N_i^*)\hbar\omega_{21}}{4\tau_{21}}\frac{T_2}{\gamma}\left(\frac{W_b}{W_b^*}-1\right)`],
    ["čtyřhladinový: výkon", R`P_L = \frac{V_f\,\hbar\omega_{21}\,\gamma_2}{2\sigma l\tau_{21}}\left(\frac{W_b}{W_b^*}-1\right)`],
    ["prahový budicí výkon", R`P_b^* = W_b^*N_1\hbar\omega_{13}V_f\frac{1}{\eta_b}`]
  ]}
];
})();
