document.addEventListener('DOMContentLoaded', function(){
  var buttons = document.querySelectorAll('[data-hub-action]');
  buttons.forEach(function(btn){
    btn.addEventListener('click', function(){
      var toast = document.getElementById('toast');
      if(toast){
        toast.textContent = '已记录：' + btn.textContent;
        toast.style.display = 'block';
        setTimeout(function(){ toast.style.display = 'none'; }, 1800);
      }
    });
  });
});
