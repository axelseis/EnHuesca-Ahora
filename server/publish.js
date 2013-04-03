//  Artworks -- {
//    artistName:         String,
//    title:              String,
//    briefDescription:   String,
//    mediaAndMaterials:  String,
//    productionDate:     String,
//    measurements:       String,
//    installation:       String,
//    objectType:         String,
//    subject:            String,
//    theme:              String,
//    locationStreet:     String,
//    locationSuburb:     String,
//    locationLatitude:   String,
//    locationLongitude:  String
//  }
Artworks = new Meteor.Collection('artworks');

Meteor.publish('artworks', function () {
  return Artworks.find({locationLatitude:{$ne: ""}, locationLongitude:{$ne: ""}});
});

//  Docs -- {
//    order: Integer,
//    title: String,
//    body:  String
//  }
Docs = new Meteor.Collection('docs');

Meteor.publish('docs', function () {
  return Docs.find({}, {sort: {order: 1}});
});