$(document).on('change', '.btn-file :file', function() {
    var input = $(this),
        numFiles = input.get(0).files ? input.get(0).files.length : 1,
        label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
    input.trigger('fileselect', [numFiles, label]);
});

$(document).ready( function() {
    $('.button-choose-file').addClass("btn btn-default btn-file button");
    $('.browse-text').show();
    $('#check-for-errors-btn').attr('disabled','disabled')
    existing = $('.btn-file :file').val().replace(/\\/g, '/').replace(/.*\//, '');
    if (existing !== '') {
        $('#statusbar-header').show();
        $('.file-label').html(existing);
        $('.del-label').html('<a id="remove-link" href="#">Remove</a>');
        $('#check-for-errors-btn').removeAttr('disabled');
        $('#file-select-button').hide();
        $('.fancy-file-button').css({'-ms-filter': 'progid:DXImageTransform.Microsoft.Alpha(Opacity=50)',
            'filter': 'alpha(opacity=50)',
            '-moz-opacity': '0.5',
            '-khtml-opacity': '0.5',
            'opacity': '0.5'});
        $('#remove-link').click(function() {
            $('#statusbar-header').hide();
            $('#check-for-errors-btn').attr('disabled', 'disabled');
            $('#file-select-button').show();
            $('.fancy-file-button').css({'-ms-filter': 'progid:DXImageTransform.Microsoft.Alpha(Opacity=100)',
                'filter': 'alpha(opacity=100)',
                '-moz-opacity': '1.0',
                '-khtml-opacity': '1.0',
                'opacity': '1.0'});
            var control = $('#file-select-button')
            control.replaceWith( control = control.clone( true ) );
        });
    }
    $('.btn-file :file').on('fileselect', function(event, numFiles, label) {
        if (label !== '') {
            $('#statusbar-header').show();
            $('.file-label').html(label);
            $('.del-label').html('<a id="remove-link" href="#">Remove file</a>');
            $('#title').html('Confirm the file you want us to check');
            $('#check-for-errors-btn').removeAttr('disabled');
            $('#file-select-button').hide();
            $('.fancy-file-button').css({'-ms-filter': 'progid:DXImageTransform.Microsoft.Alpha(Opacity=50)',
                'filter': 'alpha(opacity=50)',
                '-moz-opacity': '0.5',
                '-khtml-opacity': '0.5',
                'opacity': '0.5'});
            $('#remove-link').click(function() {
                $('#statusbar-header').hide();
                $('#title').html('Choose the file you want us to check');
                $('#check-for-errors-btn').attr('disabled', 'disabled');
                $('#file-select-button').show();
                $('.fancy-file-button').css({'-ms-filter': 'progid:DXImageTransform.Microsoft.Alpha(Opacity=100)',
                    'filter': 'alpha(opacity=100)',
                    '-moz-opacity': '1.0',
                    '-khtml-opacity': '1.0',
                    'opacity': '1.0'});
                var control = $('#file-select-button')
                control.replaceWith( control = control.clone( true ) );
            });
            if (!label.includes(".csv")) {
                $('#remove-link').click();
                window.location.assign("/invalid_csv_file");
            }
        }
    });
});
