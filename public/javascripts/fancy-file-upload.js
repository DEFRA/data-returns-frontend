$(document).on('change', '.btn-file :file', function() {
    var input = $(this),
        numFiles = input.get(0).files ? input.get(0).files.length : 1,
        label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
    input.trigger('fileselect', [numFiles, label]);
});

$(document).ready( function() {
  $('.button-choose-file').addClass("btn btn-default btn-file button");
  $('.browse-text').show();
  $('.btn-file :file').on('fileselect', function(event, numFiles, label) {
      if (label !== '') {
        $('#statusbar-header').show();
        $('.file-label').html(label);
      }  
  });
});
