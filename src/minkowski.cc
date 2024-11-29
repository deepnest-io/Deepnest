/*
Copyright 2010 Intel Corporation

Use, modification and distribution are subject to the Boost Software License,
Version 1.0. (See accompanying file LICENSE_1_0.txt or copy at
http://www.boost.org/LICENSE_1_0.txt).
*/

// code modified for the Deepnest project by Jack Qiao
// https://github.com/Jack000/Deepnest/blob/master/minkowski.cc
// updated for never node version taken from:
// https://github.com/9swampy/Deepnest/tree/develop

#define BOOST_POLYGON_NO_DEPS

#include <iostream>
#include <string>
#include <sstream>
#include <limits>
#include <vector>
#include <algorithm>

#include <nan.h>
#include <boost/polygon/polygon.hpp>

typedef boost::polygon::point_data<int> Point;
typedef boost::polygon::polygon_set_data<int> PolygonSet;
typedef boost::polygon::polygon_with_holes_data<int> Polygon;
typedef std::pair<Point, Point> Edge;

void convolveTwoSegments(std::vector<Point>& figure, const Edge& a, const Edge& b) {
    figure.clear();
    figure.push_back(Point(a.first));
    figure.push_back(Point(a.first));
    figure.push_back(Point(a.second));
    figure.push_back(Point(a.second));
    boost::polygon::convolve(figure[0], b.second);
    boost::polygon::convolve(figure[1], b.first);
    boost::polygon::convolve(figure[2], b.first);
    boost::polygon::convolve(figure[3], b.second);
}

template <typename Iterator1, typename Iterator2>
void convolveTwoPointSequences(PolygonSet& result, Iterator1 ab, Iterator1 ae, Iterator2 bb, Iterator2 be) {
    if (ab == ae || bb == be) return;

    Point firstA = *ab;
    Point prevA = *ab;
    std::vector<Point> vec;
    Polygon poly;
    ++ab;
    for (; ab != ae; ++ab) {
        Point firstB = *bb;
        Point prevB = *bb;
        Iterator2 tmpB = bb;
        ++tmpB;
        for (; tmpB != be; ++tmpB) {
            convolveTwoSegments(vec, std::make_pair(prevB, *tmpB), std::make_pair(prevA, *ab));
            boost::polygon::set_points(poly, vec.begin(), vec.end());
            result.insert(poly);
            prevB = *tmpB;
        }
        prevA = *ab;
    }
}

template <typename Iterator>
void convolvePointSequenceWithPolygons(PolygonSet& result, Iterator b, Iterator e, const std::vector<Polygon>& polygons) {
    for (std::size_t i = 0; i < polygons.size(); ++i) {
        convolveTwoPointSequences(result, b, e, boost::polygon::begin_points(polygons[i]), boost::polygon::end_points(polygons[i]));
        for (auto itrh = boost::polygon::begin_holes(polygons[i]); itrh != boost::polygon::end_holes(polygons[i]); ++itrh) {
            convolveTwoPointSequences(result, b, e, boost::polygon::begin_points(*itrh), boost::polygon::end_points(*itrh));
        }
    }
}

void convolveTwoPolygonSets(PolygonSet& result, const PolygonSet& a, const PolygonSet& b) {
    result.clear();
    std::vector<Polygon> aPolygons, bPolygons;
    a.get(aPolygons);
    b.get(bPolygons);

    for (std::size_t ai = 0; ai < aPolygons.size(); ++ai) {
        convolvePointSequenceWithPolygons(result, boost::polygon::begin_points(aPolygons[ai]), boost::polygon::end_points(aPolygons[ai]), bPolygons);
        for (auto itrh = boost::polygon::begin_holes(aPolygons[ai]); itrh != boost::polygon::end_holes(aPolygons[ai]); ++itrh) {
            convolvePointSequenceWithPolygons(result, boost::polygon::begin_points(*itrh), boost::polygon::end_points(*itrh), bPolygons);
        }
        for (std::size_t bi = 0; bi < bPolygons.size(); ++bi) {
            Polygon tmpPoly = aPolygons[ai];
            result.insert(boost::polygon::convolve(tmpPoly, *(boost::polygon::begin_points(bPolygons[bi]))));
            tmpPoly = bPolygons[bi];
            result.insert(boost::polygon::convolve(tmpPoly, *(boost::polygon::begin_points(aPolygons[ai]))));
        }
    }
}

double inputScale;

NAN_METHOD(calculateNFP) {
    v8::Local<v8::Context> context = info.GetIsolate()->GetCurrentContext();
    v8::Isolate* isolate = info.GetIsolate();

    v8::Local<v8::Object> group = v8::Local<v8::Object>::Cast(info[0]);
    v8::Local<v8::Array> A = v8::Local<v8::Array>::Cast(group->Get(context, v8::String::NewFromUtf8(isolate, "A", v8::NewStringType::kNormal).ToLocalChecked()).ToLocalChecked());
    v8::Local<v8::Array> B = v8::Local<v8::Array>::Cast(group->Get(context, v8::String::NewFromUtf8(isolate, "B", v8::NewStringType::kNormal).ToLocalChecked()).ToLocalChecked());

    PolygonSet a, b, c;
    std::vector<Polygon> polys;
    std::vector<Point> pts;

    // Calculate bounds for scaling factor
    double AmaxX = 0, AminX = 0, AmaxY = 0, AminY = 0;
    double BmaxX = 0, BminX = 0, BmaxY = 0, BminY = 0;

    auto calculateBounds = [&](v8::Local<v8::Array> array, double& maxX, double& minX, double& maxY, double& minY) {
        unsigned int len = array->Length();
        for (unsigned int i = 0; i < len; i++) {
            v8::Local<v8::Object> obj = v8::Local<v8::Object>::Cast(array->Get(context, i).ToLocalChecked());
            double x = obj->Get(context, v8::String::NewFromUtf8(isolate, "x", v8::NewStringType::kNormal).ToLocalChecked()).ToLocalChecked()->NumberValue(context).FromJust();
            double y = obj->Get(context, v8::String::NewFromUtf8(isolate, "y", v8::NewStringType::kNormal).ToLocalChecked()).ToLocalChecked()->NumberValue(context).FromJust();
            maxX = std::max(maxX, x);
            minX = std::min(minX, x);
            maxY = std::max(maxY, y);
            minY = std::min(minY, y);
        }
    };

    calculateBounds(A, AmaxX, AminX, AmaxY, AminY);
    calculateBounds(B, BmaxX, BminX, BmaxY, BminY);

    double CmaxX = AmaxX + BmaxX;
    double CminX = AminX + BminX;
    double CmaxY = AmaxY + BmaxY;
    double CminY = AminY + BminY;

    double maxXAbs = std::max(CmaxX, std::fabs(CminX));
    double maxYAbs = std::max(CmaxY, std::fabs(CminY));
    double maxDa = std::max(maxXAbs, maxYAbs);
    int maxI = std::numeric_limits<int>::max();

    if (maxDa < 1) maxDa = 1;

    inputScale = (0.1f * static_cast<double>(maxI)) / maxDa;

    auto convertPoints = [&](v8::Local<v8::Array> array, std::vector<Point>& points) {
        unsigned int len = array->Length();
        for (unsigned int i = 0; i < len; i++) {
            v8::Local<v8::Object> obj = v8::Local<v8::Object>::Cast(array->Get(context, i).ToLocalChecked());
            int x = static_cast<int>(inputScale * obj->Get(context, v8::String::NewFromUtf8(isolate, "x", v8::NewStringType::kNormal).ToLocalChecked()).ToLocalChecked()->NumberValue(context).FromJust());
            int y = static_cast<int>(inputScale * obj->Get(context, v8::String::NewFromUtf8(isolate, "y", v8::NewStringType::kNormal).ToLocalChecked()).ToLocalChecked()->NumberValue(context).FromJust());
            points.push_back(Point(x, y));
        }
    };

    convertPoints(A, pts);
    Polygon poly;
    boost::polygon::set_points(poly, pts.begin(), pts.end());
    a += poly;

    v8::Local<v8::Array> holes = v8::Local<v8::Array>::Cast(A->Get(context, v8::String::NewFromUtf8(isolate, "children", v8::NewStringType::kNormal).ToLocalChecked()).ToLocalChecked());
    unsigned int holesLen = holes->Length();
    for (unsigned int i = 0; i < holesLen; i++) {
        v8::Local<v8::Array> hole = v8::Local<v8::Array>::Cast(holes->Get(context, i).ToLocalChecked());
        pts.clear();
        convertPoints(hole, pts);
        boost::polygon::set_points(poly, pts.begin(), pts.end());
        a -= poly;
    }

    pts.clear();
    convertPoints(B, pts);
    double xShift = 0, yShift = 0;
    for (unsigned int i = 0; i < pts.size(); i++) {
        if (i == 0) {
            xShift = static_cast<double>(pts[i].get(boost::polygon::HORIZONTAL)) / inputScale;
            yShift = static_cast<double>(pts[i].get(boost::polygon::VERTICAL)) / inputScale;
        }
        pts[i] = Point(-pts[i].get(boost::polygon::HORIZONTAL), -pts[i].get(boost::polygon::VERTICAL));
    }
    boost::polygon::set_points(poly, pts.begin(), pts.end());
    b += poly;

    polys.clear();
    convolveTwoPolygonSets(c, a, b);
    c.get(polys);

    v8::Local<v8::Array> resultList = v8::Array::New(isolate);
    for (unsigned int i = 0; i < polys.size(); ++i) {
        v8::Local<v8::Array> pointList = v8::Array::New(isolate);
        int j = 0;
        for (auto itr = polys[i].begin(); itr != polys[i].end(); ++itr) {
            v8::Local<v8::Object> p = v8::Object::New(isolate);
            p->Set(context, v8::String::NewFromUtf8(isolate, "x", v8::NewStringType::kNormal).ToLocalChecked(), v8::Number::New(isolate, static_cast<double>((*itr).get(boost::polygon::HORIZONTAL)) / inputScale + xShift));
            p->Set(context, v8::String::NewFromUtf8(isolate, "y", v8::NewStringType::kNormal).ToLocalChecked(), v8::Number::New(isolate, static_cast<double>((*itr).get(boost::polygon::VERTICAL)) / inputScale + yShift));
            pointList->Set(context, j++, p);
        }

        v8::Local<v8::Array> children = v8::Array::New(isolate);
        int k = 0;
        for (auto itrh = boost::polygon::begin_holes(polys[i]); itrh != boost::polygon::end_holes(polys[i]); ++itrh) {
            v8::Local<v8::Array> child = v8::Array::New(isolate);
            int z = 0;
            for (auto itr2 = (*itrh).begin(); itr2 != (*itrh).end(); ++itr2) {
                v8::Local<v8::Object> c = v8::Object::New(isolate);
                c->Set(context, v8::String::NewFromUtf8(isolate, "x", v8::NewStringType::kNormal).ToLocalChecked(), v8::Number::New(isolate, static_cast<double>((*itr2).get(boost::polygon::HORIZONTAL)) / inputScale + xShift));
                c->Set(context, v8::String::NewFromUtf8(isolate, "y", v8::NewStringType::kNormal).ToLocalChecked(), v8::Number::New(isolate, static_cast<double>((*itr2).get(boost::polygon::VERTICAL)) / inputScale + yShift));
                child->Set(context, z++, c);
            }
            children->Set(context, k++, child);
        }

        pointList->Set(context, v8::String::NewFromUtf8(isolate, "children", v8::NewStringType::kNormal).ToLocalChecked(), children);
        resultList->Set(context, i, pointList);
    }

    info.GetReturnValue().Set(resultList);
}