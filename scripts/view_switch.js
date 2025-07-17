// Prepínanie pohľadov
document.querySelectorAll('.nav-tab').forEach(link => {
    link.addEventListener('click', () => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(link.dataset.target).classList.add('active');
    });
});