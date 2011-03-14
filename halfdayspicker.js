/**
 * Widget displaying a date interval
 * @param settings An object containing the following fields:
 *                 - elm: a jQuery element corresponding to the input elements. The interval picker widget expects
 *                 that node to contain children following these conventions:
 *                   - 'start-date' class for the start date input element ;
 *                   - 'start-morning' and 'start-afternoon' classes for the 'Matin' and 'Après-midi' checkboxes ;
 *                   - 'stop-date' class for the end date input element ;
 *                   - 'stop-morning' and 'stop-afternoon' classes for the 'Matin' and 'Après-midi' checkboxes
 *                  - dateFormat (optional): the date format to use (default 'dd/MM/yyyy')
 */
var HalfDaysPicker = function(settings) {
    var self = this; // Avoid ambiguities in nested functions
    
    self.node = $(settings.elm);
    
    // Compute the model. FIXME I would like to factorize these two structures
    self.start = {
        elm: self.node.find('.start'), // The root element
        input: self.node.find('.start-date'), // The date input field
        morning: self.node.find('.start-morning'), // The morning checkbox
        afternoon: self.node.find('.start-afternoon'), // The afternoon checkbox
        view: {} // A future reference to the dd element corresponding to the start time
    }
    self.stop = {
        elm: self.node.find('.stop'),
        input: self.node.find('.stop-date'),
        morning: self.node.find('.stop-morning'),
        afternoon: self.node.find('.stop-afternoon'),
        view: {}
    }
    
    self.types = settings.types ? settings.types : {};
    
    self.retrieveHalfdays = settings.getHalfdaysStatus ? settings.getHalfdaysStatus : function(from, to, callback) { callback([]); };
    
    self.monthNumber = settings.monthNumber ? settings.monthNumber : 2;
    
    self.format = settings.dateFormat ? settings.dateFormat : 'dd/MM/yyyy';
    self.widget = {};
    
    
    /**
     * Set the date of a given model
     * @param model An object like self.start or self.stop
     * @param date The jQuery element of the dd containing the date
     */
    var setDate = function(model, date) {
        model.view = date;
        // Clear checkboxes
        model.morning.removeAttr('checked');
        model.afternoon.removeAttr('checked');
        if(date) {
          model.input.val(date.parents('.day').data('time')).change();
          if (date.is('.morning')) {
              model.morning.attr('checked', 'checked').change();
          } else {
              model.afternoon.attr('checked', 'checked').change();
          }
        }
        else {
          model.input.val("").change();
        }
    };

    /**
     * Select a start date for the interval and gives the focus to the end date field if empty
     * @param date A jQuery element containing the clicked date
     */
    self.setStartDate = function(date) {
        setDate(self.start, date);
    };
    
    /**
     * Select an end date for the interval and hide the widget
     * @param date A jQuery element containing the clicked date
     */
    self.setStopDate = function(date) {
        setDate(self.stop, date);
    };

    self.render = function() {
        var startDate = self.start.view;
        var endDate = self.stop.view;
        
        // Clear previous interval
        self.widget.find('dd.selected').removeClass('selected');
        self.widget.find('dd.included').removeClass('included');
        
        // Show the new interval
        if (startDate) { // Show the selected start date
            $(startDate).addClass('selected');
        }
        if (endDate) { // Show the selected end date
            $(endDate).addClass('selected');
        }
        if (startDate && endDate) { // Show the interval
            (function(startDate, endDate) {
                var dds = self.widget.find('dd');
                var startIndex = dds.index(startDate);
                var endIndex = dds.index(endDate);
                dds.filter(':lt('+endIndex+')').filter(':gt('+startIndex+')').addClass('included');
            })(startDate, endDate);
        }
    };
    
    self.updateHalfdays = function() {
      var allDays = self.widget.find('.day');
      var from = allDays.first().data('time');
      var to = allDays.last().data('time');
      self.retrieveHalfdays(from, to, function(days){
        for(var d=0; d<days.length; ++d) {
          var day = days[d];
          var dayContainer = allDays.filter(function(){
            return $(this).data('time')==day.date;
          });
          var texts = day.classes.split(/\s+/);
          for(var t=0; t<texts.length; ++t)
            if(self.types[ texts[t] ])
              texts[t] = self.types[ texts[t] ];
          var text = texts.join(', ');
          if(day.morning) {
            $('.morning', dayContainer).addClass(day.classes)
            .filter('dt').text(text);
          }
          if(day.afternoon) {
            $('.afternoon', dayContainer).addClass(day.classes)
            .filter('dt').text(text);
          }
        }
        self.widget.show();
      });
    }
    
    self.updateWithInputs = function() {
      var allDays = self.widget.find('.day');
      self.start.view = allDays.filter(function(){
        return $(this).data('time')==self.start.input.val();
      });
      self.stop.view = allDays.filter(function(){
        return $(this).data('time')==self.stop.input.val();
      });
      self.render();
    }

    self.generateWidget = function(startMonth) {
        var today = Date.today();
        
        self.widget = $('<ul class="halfdayspicker" />');
        var month = startMonth.clone();
        for(var m=0; m<self.monthNumber; ++m, month.addMonths(1)) {
          var monthText = month.toString("MMMM yyyy");
          var monthLi = $('<li />');
          monthLi.append('<h3>'+monthText+'</h3>');
          var daysContainer = $('<div class="days" />');
          
          var monthNum = month.getMonth();
          for(var day = month.set({ day: 1 }).clone(); day.getMonth() == monthNum; day.addDays(1)) {
            var dayNode = $('<div class="day" />');
            if(today.getYear() == day.getYear()) {
              if(today.getWeekOfYear() == day.getWeekOfYear())
                dayNode.addClass('currentWeek');
              if(today.getDayOfYear() == day.getDayOfYear())
                dayNode.addClass('currentDay');
            }
            dayNode.data('time', day.toString(self.format));
            dayNode.append('<span class="dayNum">'+day.toString('dd')+'</span>');
            dayNode.append('<dl><dt class="morning"></dt><dd class="morning">M</dd></dl>');
            dayNode.append('<dl><dt class="afternoon"></dt><dd class="afternoon">A</dd></dl>');
            daysContainer.append(dayNode);
          }
          monthLi.append(daysContainer);
          self.widget.append(monthLi);
        }
        self.node.after(self.widget);
        
        self.updateHalfdays();
        self.updateWithInputs();
    }
    
    self.bindAll = function() {
        // Bind events on their handlers
        // Handle clicks on our widget
        
        var mousePressed = false;
        var selectDragging = false;
        var selectIsStart = false;
        var targetDown = null;
        
        var setDates = function(a, b, updateInputs) {
          var dds = self.widget.find('dd');
          if(a==null) {
            a = b;
            b = null;
          }
          if(a!=null && b!=null) {
            if(dds.index(a) > dds.index(b)) {
              var tmp = b;
              b = a;
              a = tmp;
            }
          }
          if(updateInputs) {
            self.setStartDate(a);
            self.setStopDate(b);
          }
          else {
            self.start.view = a;
            self.stop.view = b;
          }
        }
        
        var onSelectDrag = function(target, updateInputs) {
          setDates(target, selectIsStart ? self.stop.view : self.start.view, updateInputs);
        }
        
        $(window).bind('mouseup', function(e){
          var target = $(e.target);
          if(target.is('dd') && target.parents('.halfdayspicker')[0] == self.widget[0]) {
            if(selectDragging && self.start.view && self.stop.view) {
              onSelectDrag(target, true);
            }
            else {
              if(targetDown && target[0] == targetDown[0]) {
                setDates(target, self.start.view, true);
              }
              else {
                setDates(targetDown, target, true);
              }
            }
            self.render();
          }
          mousePressed = false;
          selectDragging = false;
        });
        $(window).bind('mousedown', function(e){
          mousePressed = true;
          var target = $(e.target);
          if(target.is('dd') && target.parents('.halfdayspicker')[0] == self.widget[0]) {
            targetDown = target;
            if(target.is('.selected')) {
              selectDragging = true;
              selectIsStart = targetDown[0] == self.start.view[0];
            }
            else {
              selectDragging = false;
              if(self.stop.view) {
                setDates(null, null, false);
                self.render();
              }
            }
            
          }
        });
        $(window).bind('mousemove', function(e){
          var target = $(e.target);
          if(target.is('dd') && target.parents('.halfdayspicker')[0] == self.widget[0]) {
            if(selectDragging && self.start.view && self.stop.view) {
              onSelectDrag(target, false);
              self.render();
            }
            else if(mousePressed) {
              setDates(targetDown, target, false);
              self.render();
            }
          }
        });
        
        // Track input changes
        self.start.input.change(function() {
          self.render();
        });
        self.stop.input.change(function() {
          self.render();
        });
    }
    
    self.generateWidget(Date.today().set({ month: 0, year: 2011 }));
    self.bindAll();
    self.updateWithInputs();
}

